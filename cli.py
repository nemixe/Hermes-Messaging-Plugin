"""Operator commands for mapping GitLab repositories to Hermes profiles."""
import fcntl
import hashlib
import os
from pathlib import Path
import re
import shutil
import tempfile
from urllib.parse import urlsplit

import yaml

from gateway.config import GatewayConfig, PlatformConfig
from gateway.config_loader import merge_platform_sections
from gateway.platforms._shared import extra_or_secret
from hermes_constants import get_default_hermes_root, get_hermes_home
from hermes_cli.config_backups import backup_config
from hermes_cli.profiles import create_profile, get_profile_dir, normalize_profile_name, validate_profile_name
from utils import atomic_write_bytes, atomic_write_text, atomic_yaml_write

from .adapter import ids

TEMPLATE_PROFILE = "project-egg"
SHARED_PROFILE = "global-project"
RESERVED_PROFILES = {"default", TEMPLATE_PROFILE, SHARED_PROFILE}
PROJECT_MARKER = "hermes_gitlab_project"


def configure_project_directory(profile, *, destination=None):
    """Materialize the local terminal default per profile, including cloned starters."""
    from tools.terminal_scope import build_profile_terminal_scope

    path = profile / "config.yaml"
    if path.is_symlink():
        raise ValueError("Project config.yaml must not be symlinked")
    config = yaml.safe_load(path.read_text())
    if not isinstance(config, dict) or not isinstance(config.get("terminal", {}), dict):
        raise ValueError("Project config.yaml and terminal settings must be mappings")
    terminal = config.setdefault("terminal", {})
    if build_profile_terminal_scope(profile).get("TERMINAL_ENV", "local") != "local":
        return
    target = destination or profile
    egg = get_profile_dir(TEMPLATE_PROFILE)
    cwd = terminal.get("cwd")
    inherited = {p.resolve() for p in (target / "workspace", egg, egg / "workspace")}
    if (cwd in (None, "", ".", "auto", "cwd", "workspace") or
            isinstance(cwd, str) and Path(cwd).is_absolute() and Path(cwd).resolve() in inherited) and cwd != str(target):
        terminal["cwd"] = str(target)
        backup_config(path, "gitlab-project-directory")
        atomic_yaml_write(path, config, create_mode=0o600)


def public_url(value):
    """Only publish credential-free HTTP(S) locations in agent-visible knowledge."""
    if not value:
        return None
    if not isinstance(value, str):
        raise ValueError("Repository knowledge URL must be a string")
    parsed = urlsplit(value)
    if (parsed.scheme not in {"http", "https"} or not parsed.hostname
            or parsed.username is not None or parsed.password is not None
            or parsed.query or parsed.fragment or any(c.isspace() for c in value)):
        raise ValueError("Repository knowledge URLs must be HTTP(S) without credentials, query or fragment")
    return value.rstrip("/")


def sync_project_knowledge(profile, config=None):
    """Refresh managed orientation and inventory without replacing learned knowledge."""
    soul, inventory = profile / "SOUL.md", profile / "PROJECT.yaml"
    if any(path.is_symlink() for path in (profile.parent, profile, soul, inventory)):
        raise ValueError("Project knowledge paths must not be symlinked")
    start, end = "<!-- hermes-gitlab:orientation:start -->", "<!-- hermes-gitlab:orientation:end -->"
    template = (Path(__file__).parent / "templates" / TEMPLATE_PROFILE / "SOUL.md").read_text()
    block = start + template.split(start, 1)[1].split(end, 1)[0] + end
    before = soul.read_text() if soul.exists() else ""
    if start in before or end in before:
        if before.count(start) != 1 or before.count(end) != 1 or before.index(end) < before.index(start):
            raise ValueError("Repair the managed project orientation markers in SOUL.md before syncing")
        after = before[:before.index(start)] + block + before[before.index(end) + len(end):]
    else:
        after = before + ("\n\n" if before else "") + block + "\n"
    after = after.replace("(`skills/gitlab-cli/SKILL.md`).", "(use `skill_view` by name).")
    after = after.replace("read `skills/codev-gitlab/SKILL.md` and follow",
                          "load `codev-gitlab` with `skill_view` and follow")
    data = None
    if config is not None:
        extra = PlatformConfig.from_dict(merge_platform_sections(config, config.get("gateway", {}), {})
                                         .get("gitlab", {})).extra
        info = extra.get("repository_info") or {}
        owned = {route["chat_id"].split(":")[1] for route in route_settings(config).get("profile_routes", [])
                 if managed_route(route) and route.get("profile") == profile.name and route.get("enabled", True)}
        repositories = []
        for ident in sorted(owned, key=int):
            row = info.get(ident) or {}
            repositories.append({"id": ident, "name": row.get("name"), "url": public_url(row.get("url")),
                                 "clone_path": f"workspace/{ident}"})
        data = {"profile": profile.name, "gitlab_url": public_url(extra_or_secret(extra, "url", "GITLAB_URL")),
                "repositories": repositories}
    configure_project_directory(profile)
    if after != before:
        atomic_write_text(soul, after, preserve_mode=True, create_mode=0o600)
    if data is not None:
        content = "# Generated by hermes-gitlab; edit repository mappings, not this file.\n" + yaml.safe_dump(data, sort_keys=False)
        if not inventory.exists() or inventory.read_text() != content:
            atomic_write_text(inventory, content, preserve_mode=True, create_mode=0o600)


def sync_project_skills(profile, *, overwrite=True):
    """Update bundled skill files, backing up changed copies before any replacement."""
    bundle = Path(__file__).parent / "templates" / SHARED_PROFILE / "skills"
    backup_root = profile / "backups" / "gitlab-skills"
    changes = []
    for skill in sorted(bundle.iterdir()):
        if not (skill / "SKILL.md").is_file():
            continue
        for source in sorted(skill.rglob("*")):
            if (not source.is_file() or source.name == ".DS_Store" or "__pycache__" in source.parts
                    or source.suffix in {".pyc", ".pyo"}):
                continue
            target = profile / "skills" / source.relative_to(bundle)
            for path in (target, *target.parents, backup_root, *backup_root.parents):
                if path.is_relative_to(profile.parent) and path.is_symlink():
                    raise ValueError(f"Skill sync paths must not be symlinked: {path}")
            content = source.read_bytes()
            if target.exists() and not overwrite:
                continue
            if not target.exists() or target.read_bytes() != content:
                changes.append((target, content, target.stat().st_mode & 0o777 if target.exists()
                                else source.stat().st_mode & 0o777))
    existing = [target for target, _, _ in changes if target.exists()]
    if existing:
        backup_root.mkdir(parents=True, exist_ok=True, mode=0o700)
        backup = Path(tempfile.mkdtemp(prefix="sync-", dir=backup_root))
        print(f"Skill backup: {backup}")
        for target in existing:
            saved = backup / target.relative_to(profile / "skills")
            saved.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(target, saved)
    for target, content, mode in changes:
        atomic_write_bytes(target, content, mode=mode)
    if changes and overwrite:
        print(f"Synced {len(changes)} bundled skill files: {profile.name}")


def migrate_shared_skills(profile):
    """Archive legacy local copies so Hermes resolves the shared skills by name."""
    bundle = Path(__file__).parent / "templates" / SHARED_PROFILE / "skills"
    backup_root = profile / "backups" / "gitlab-skills"
    legacy = [profile / "skills" / skill.name for skill in sorted(bundle.iterdir())
              if (skill / "SKILL.md").is_file()]
    for path in [backup_root, *backup_root.parents, *(p for skill in legacy for p in (skill, *skill.parents))]:
        if path.is_relative_to(profile.parent) and path.is_symlink():
            raise ValueError(f"Skill migration paths must not be symlinked: {path}")
    link_shared_skills(profile)
    legacy = [path for path in legacy if path.exists()]
    if legacy:
        backup_root.mkdir(parents=True, exist_ok=True, mode=0o700)
        backup = Path(tempfile.mkdtemp(prefix="sync-", dir=backup_root))
        print(f"Legacy skill backup: {backup}")
        for path in legacy:
            path.rename(backup / path.name)


def refresh_project_knowledge(root, *, sync_skills=False):
    """Backfill existing projects on plugin load or explicit operator refresh."""
    if not (root / "config.yaml").is_file():
        return
    with (root / ".gitlab-projects.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        config = read_config(root / "config.yaml")
        if sync_skills:
            sync_project_skills(root / "profiles" / SHARED_PROFILE)
            migrate_shared_skills(root / "profiles" / TEMPLATE_PROFILE)
        mapped = {route.get("profile") for route in route_settings(config).get("profile_routes", [])
                  if managed_route(route)}
        for profile in sorted((root / "profiles").iterdir()):
            if profile.name not in RESERVED_PROFILES and (profile.name in mapped or is_project_profile(profile)):
                if (profile / "config.yaml").is_file():
                    sync_project_knowledge(profile, config)
                    if sync_skills:
                        migrate_shared_skills(profile)
                    mark_project_profile(profile)


def project_metadata(profile):
    path = profile / "profile.yaml"
    if profile.is_symlink() or path.is_symlink():
        raise ValueError("Project profile metadata must not be symlinked")
    data = yaml.safe_load(path.read_text()) if path.exists() else {}
    if data is None:
        data = {}
    if not isinstance(data, dict):
        raise ValueError("Project profile.yaml must be a mapping")
    return data


def is_project_profile(profile):
    try:
        return profile.name not in RESERVED_PROFILES and project_metadata(profile).get(PROJECT_MARKER) is True
    except (OSError, ValueError, yaml.YAMLError):
        return False


def mark_project_profile(profile):
    if profile.name in RESERVED_PROFILES:
        raise ValueError("The default, project-egg and global-project profiles cannot be marked as projects")
    data = project_metadata(profile)
    if data.get(PROJECT_MARKER) is not True:
        data[PROJECT_MARKER] = True
        atomic_yaml_write(profile / "profile.yaml", data, create_mode=0o600)


def link_shared_skills(profile):
    path = profile / "config.yaml"
    if path.is_symlink():
        raise ValueError("The profile config.yaml must not be symlinked")
    config = yaml.safe_load(path.read_text())
    if not isinstance(config, dict):
        raise ValueError("Profile config.yaml must be a mapping")
    skills = config.setdefault("skills", {})
    if not isinstance(skills, dict):
        raise ValueError("Profile skills must be a mapping")
    entries = skills.get("external_dirs", [])
    if isinstance(entries, str):
        entries = [entries]
    if not isinstance(entries, list) or any(not isinstance(entry, str) for entry in entries):
        raise ValueError("Profile skills.external_dirs must be a path or list of paths")
    shared = f"../{SHARED_PROFILE}/skills"
    if shared not in entries:
        skills["external_dirs"] = [*entries, shared]
        backup_config(path, "gitlab-shared-skills")
        atomic_yaml_write(path, config, create_mode=0o600)


def ensure_template():
    """Install the starter and shared profile; preserve customization and merge the skills link."""
    from hermes_cli.profiles import _bootstrap_profile_dir, _finish_profile_layout, _notify_multiplexer
    from hermes_constants import clear_named_profile_deleted

    root = get_default_hermes_root()
    profile = get_profile_dir(TEMPLATE_PROFILE)
    root.mkdir(parents=True, exist_ok=True)
    with (root / ".gitlab-template.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        shared = get_profile_dir(SHARED_PROFILE)
        if shared.is_symlink() or shared.parent.is_symlink():
            raise ValueError("The global-project profile must not be symlinked")
        if not shared.exists():
            create_profile(SHARED_PROFILE, no_alias=True, no_skills=True,
                           description="Shared skills for GitLab project profiles")
            if not (shared / "config.yaml").exists():
                atomic_yaml_write(shared / "config.yaml", {}, create_mode=0o600)
        if not (shared / "config.yaml").is_file() or (shared / "skills").is_symlink():
            raise ValueError("The global-project profile is incomplete or its skills directory is symlinked")
        (shared / "skills").mkdir(exist_ok=True)
        sync_project_skills(shared, overwrite=False)
        if profile.is_symlink() or profile.parent.is_symlink():
            raise ValueError("The project-egg template profile must not be symlinked")
        if profile.exists():
            if not (profile / "config.yaml").is_file():
                raise ValueError("The existing project-egg profile is incomplete; repair its config.yaml first")
            link_shared_skills(profile)
            sync_project_knowledge(profile)
            return profile
        profile.parent.mkdir(parents=True, exist_ok=True)
        # Native layout helpers plus a hidden sibling keep partial templates out of
        # the live multiplexer until the complete folder can be published atomically.
        with tempfile.TemporaryDirectory(prefix=".project-egg-", dir=profile.parent) as directory:
            staging = Path(directory)
            _bootstrap_profile_dir(staging, None)
            seeded = yaml.safe_load((staging / "config.yaml").read_text()) if (staging / "config.yaml").exists() else {}
            shutil.copytree(Path(__file__).parent / "templates" / TEMPLATE_PROFILE, staging, dirs_exist_ok=True)
            config = yaml.safe_load((staging / "config.yaml").read_text())
            if not isinstance(config, dict):
                raise ValueError("Bundled project-egg config.yaml must be a mapping")
            if "model" not in config and seeded.get("model"):
                config["model"] = seeded["model"]
            atomic_yaml_write(staging / "config.yaml", config, create_mode=0o600)
            link_shared_skills(staging)
            configure_project_directory(staging, destination=profile)
            _finish_profile_layout(staging, no_skills=False, clone_all=True,
                                   description="Starter template for new GitLab projects")
            os.rename(staging, profile)
        clear_named_profile_deleted(profile)
    _notify_multiplexer(TEMPLATE_PROFILE)
    return profile


def setup_parser(parser):
    commands = parser.add_subparsers(dest="gitlab_command", required=True)
    add = commands.add_parser("add-project", help="Create/reuse a profile and add repository routes")
    add.add_argument("profile", help="Business project / Hermes profile name")
    add.add_argument("--repos", required=True, help="Comma-separated numeric GitLab project IDs")
    add.add_argument("--description", help="Role description for a new profile")
    commands.add_parser("projects", help="List managed repository-to-profile routes")
    commands.add_parser("sync-knowledge", help="Refresh project orientation, repository inventories and bundled skills")


def read_config(path, *, raw=None):
    config = yaml.safe_load(path.read_text(encoding="utf-8") if raw is None else raw)
    if not isinstance(config, dict):
        raise ValueError("config.yaml must contain a YAML mapping")
    gateway = config.get("gateway", {})
    if not isinstance(gateway, dict):
        raise ValueError("gateway must be a mapping")
    routes = route_settings(config).get("profile_routes", [])
    if not isinstance(routes, list) or any(not isinstance(route, dict) for route in routes):
        raise ValueError("gateway.profile_routes must be a list of mappings")
    return config


def route_settings(config):
    """Hermes gives non-null top-level profile_routes precedence over gateway.profile_routes."""
    return config if config.get("profile_routes") is not None else config.setdefault("gateway", {})


def managed_route(route):
    return (route.get("platform") == "gitlab"
            and re.fullmatch(r"repo:[1-9][0-9]*", str(route.get("chat_id", "")))
            and route.get("name") == "hermes-gitlab-repo-" + route["chat_id"].split(":")[1]
            and not route.get("thread_id") and not route.get("guild_id")
            and route.get("bot_profile") in (None, "", "default"))


def _update_registered_repositories(config, removed, repository_info=None):
    platforms = config.setdefault("platforms", {})
    if not isinstance(platforms, dict):
        raise ValueError("platforms must be a mapping")
    gateway = config.setdefault("gateway", {})
    platform = gateway["gitlab"] if isinstance(gateway.get("gitlab"), dict) else platforms.setdefault("gitlab", {})
    if not isinstance(platform, dict):
        raise ValueError("platforms.gitlab must be a mapping")
    extra = platform.setdefault("extra", {})
    if not isinstance(extra, dict):
        raise ValueError("platforms.gitlab.extra must be a mapping")
    effective = PlatformConfig.from_dict(merge_platform_sections(config, gateway, {}).get("gitlab", {})).extra
    existing_ids = ids(effective["projects"]) if effective.get("projects") else set()
    extra["projects"] = sorted((existing_ids - removed) | {
        route["chat_id"].split(":")[1] for route in route_settings(config).get("profile_routes", [])
        if managed_route(route)}, key=int)
    extra["require_profile_route"] = True
    if repository_info is not None:
        info = dict(effective.get("repository_info") or {})
        info.update(repository_info)
        extra["repository_info"] = {key: value for key, value in info.items() if key in extra["projects"]}


def add_project(root, profile, repositories, description, *, replace=False, revision=None, repository_info=None,
                require_project_profile=False):
    profile = normalize_profile_name(profile)
    validate_profile_name(profile)
    if profile in RESERVED_PROFILES:
        raise ValueError("Use a project name other than default, project-egg or global-project; these profiles are reserved")
    repositories = set() if replace and repositories == [] else ids(repositories)
    path = root / "config.yaml"
    if path.is_symlink():
        raise ValueError("Refusing to replace a symlinked config.yaml; edit its managed source instead")
    # ponytail: advisory lock covers this CLI; concurrent edits in other tools require rerunning the command.
    with (root / ".gitlab-projects.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        before = path.read_bytes()
        if revision is not None and hashlib.sha256(before).hexdigest() != revision:
            raise ValueError("Configuration changed; refresh the project list before saving")
        config = read_config(path, raw=before)
        if not GatewayConfig.from_dict(config).multiplex_profiles:
            raise ValueError("Enable gateway.multiplex_profiles before adding project profiles")
        routes = route_settings(config).setdefault("profile_routes", [])
        registered = any(managed_route(route) and route.get("profile") == profile for route in routes)
        removed = {route["chat_id"].split(":")[1] for route in routes
                   if replace and managed_route(route) and route.get("profile") == profile} - repositories
        routes[:] = [route for route in routes if not (
            managed_route(route) and route.get("profile") == profile
            and route["chat_id"].split(":")[1] in removed)]
        if replace:
            for route in routes:
                if managed_route(route) and route.get("profile") == profile:
                    route["enabled"] = True
        for repository in sorted(repositories, key=int):
            route_name = f"hermes-gitlab-repo-{repository}"
            for existing in routes:
                chat_id = str(existing.get("chat_id", ""))
                same_repo = chat_id == f"repo:{repository}" or chat_id.startswith(f"{repository}:")
                thread_overlap = not chat_id and existing.get("thread_id") and not existing.get("guild_id")
                if (existing.get("platform") == "gitlab" and (same_repo or thread_overlap)
                        and existing.get("bot_profile") in (None, "", "default")):
                    if existing.get("profile") != profile or existing.get("enabled", True) is not True:
                        raise ValueError(f"Repository {repository} already has a conflicting profile route")
                if existing.get("name") == route_name and not (
                        existing.get("platform") == "gitlab" and chat_id == f"repo:{repository}"
                        and existing.get("profile") == profile and not existing.get("thread_id")
                        and not existing.get("guild_id") and existing.get("bot_profile") in (None, "", "default")):
                    raise ValueError(f"Route name {route_name} is already used by a different route")
            if not any(route.get("name") == route_name for route in routes):
                routes.append({"name": route_name, "platform": "gitlab",
                               "chat_id": f"repo:{repository}", "profile": profile})
        _update_registered_repositories(config, removed, repository_info)
        profile_path = get_profile_dir(profile)
        created = not profile_path.exists()
        if not created and (profile_path.is_symlink() or not (profile_path / "config.yaml").is_file()):
            raise ValueError("Existing profile is incomplete or symlinked; repair it with Hermes first")
        if not created and require_project_profile and not registered and not is_project_profile(profile_path):
            raise ValueError("This profile already exists and is not a GitLab project; choose a new project name")
        if created:
            # Native creation publishes the profile atomically and notifies the multiplexer.
            ensure_template()
            create_profile(profile, clone_from=TEMPLATE_PROFILE, clone_all=True,
                           no_alias=True, description=description or "GitLab project")
            # Native creation omits config.yaml when no default model is configured.
            # A valid empty config keeps the profile routable until provider setup.
            if not (profile_path / "config.yaml").exists():
                atomic_yaml_write(profile_path / "config.yaml", {}, create_mode=0o600)
            migrate_shared_skills(profile_path)
        if path.read_bytes() != before:
            raise ValueError("config.yaml changed during setup; profile is preserved, rerun the command")
        mark_project_profile(profile_path)
        if config != yaml.safe_load(before):
            backup_config(path, "gitlab-projects")
            atomic_yaml_write(path, config, create_mode=0o600)
        sync_project_knowledge(profile_path, config)
        return profile, profile_path, created


def remove_project_registration(root, profile, *, revision, confirmation):
    """Prepare deletion; Desktop's native SDK must retire the profile's processes and data."""
    profile = normalize_profile_name(profile)
    validate_profile_name(profile)
    if profile in RESERVED_PROFILES:
        raise ValueError("The default, project-egg and global-project profiles cannot be deleted as projects")
    if confirmation != profile:
        raise ValueError("Type the exact project name to confirm deletion")
    path = root / "config.yaml"
    if path.is_symlink():
        raise ValueError("Refusing to replace a symlinked config.yaml; edit its managed source instead")
    with (root / ".gitlab-projects.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        before = path.read_bytes()
        if hashlib.sha256(before).hexdigest() != revision:
            raise ValueError("Configuration changed; refresh the project list before deleting")
        config = read_config(path, raw=before)
        profile_path = get_profile_dir(profile)
        if (profile_path.is_symlink() or profile_path.parent.is_symlink()
                or (profile_path.exists() and not (profile_path / "config.yaml").is_file())):
            raise ValueError("Existing profile is incomplete or symlinked; repair it with Hermes first")
        routes = route_settings(config).get("profile_routes", [])
        if any((route.get("profile") == profile and not managed_route(route))
               or route.get("bot_profile") == profile for route in routes):
            raise ValueError("This profile is used by other profile routes; remove those connections before deleting")
        removed = {route["chat_id"].split(":")[1] for route in routes
                   if managed_route(route) and route.get("profile") == profile}
        if profile_path.exists():
            if not removed and not is_project_profile(profile_path):
                raise ValueError("This profile is not a GitLab project")
            # Preserve identity after routes are removed so native profile deletion can be retried.
            mark_project_profile(profile_path)
        routes[:] = [route for route in routes if not (managed_route(route) and route.get("profile") == profile)]
        if removed:
            _update_registered_repositories(config, removed, {})
        if path.read_bytes() != before:
            raise ValueError("config.yaml changed during deletion; refresh the project list and try again")
        if config != yaml.safe_load(before):
            backup_config(path, "gitlab-projects")
            atomic_yaml_write(path, config, create_mode=0o600)
        if profile_path.exists():
            sync_project_knowledge(profile_path, config)
        return profile, profile_path.exists()


def command(args):
    try:
        root = get_default_hermes_root().resolve()
        if get_hermes_home().resolve() != root:
            raise ValueError("Run this from the default profile: hermes -p default gitlab ...")
        if args.gitlab_command == "sync-knowledge":
            ensure_template()
            refresh_project_knowledge(root, sync_skills=True)
            print("Project orientation, repository inventories and bundled skills refreshed; "
                  "changed skill files backed up, additional skills and memories preserved.")
            return
        if args.gitlab_command == "projects":
            routes = route_settings(read_config(root / "config.yaml")).get("profile_routes", [])
            for route in routes:
                if managed_route(route):
                    print(f"{route['profile']}\t{route['chat_id'].split(':')[1]}")
            return
        profile, profile_path, created = add_project(root, args.profile, args.repos, args.description)
        print(f"{'Created' if created else 'Reused'} profile {profile}: {profile_path}")
        print("Repository routes saved. Restart the default gateway to activate the full routing change.")
        if created:
            print("Starter prompts, skills, SOUL and configuration copied from project-egg.")
    except (ValueError, OSError, yaml.YAMLError) as exc:
        # YAML parse exceptions can include config lines containing secrets.
        message = "Invalid YAML in config.yaml; no routing changes saved" if isinstance(exc, yaml.YAMLError) else str(exc)
        raise SystemExit(f"GitLab project setup failed: {message}") from None
