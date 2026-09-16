import {
  Button, Checkbox, Codicon, EmptyState, ErrorState, Input, Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue, Skeleton,
  host, ROUTES_AREA, SIDEBAR_NAV_AREA, usePluginI18n, useQuery, useQueryClient, useValue
} from '@hermes/plugin-sdk'
import { useEffect, useRef, useState } from 'react'
import { jsx, jsxs } from 'react/jsx-runtime'

const ID = 'hermes-gitlab'
const locales = {
  en: {
    profileIdentifier: 'Project profile ID',
    title: 'GitLab Projects', intro: 'One Hermes profile per project. Registered repositories share its knowledge.',
    projects: 'Projects', newProject: 'New project', edit: 'Edit registration', save: 'Save and activate', cancel: 'Cancel',
    refresh: 'Refresh', retry: 'Try again', messaging: 'Open Messaging', profile: 'Hermes profile', description: 'Description',
    nameHint: 'Use 1–64 lowercase letters, numbers, hyphens or underscores. Start with a letter or number.',
    nameInvalid: 'Enter a valid project name; default, project-egg and global-project are reserved.',
    nameExists: 'This profile already exists. Cancel and select it from Projects to edit its registration.',
    optional: 'Optional project context', repositories: 'Registered repositories', selected: n => `Selected repositories (${n}/200)`,
    count: n => `${n} ${n === 1 ? 'repository' : 'repositories'}`, unregistered: 'Not registered', missing: 'Profile missing',
    missingHint: 'Saving copies the project-egg starter into this profile.',
    disabled: 'Route disabled · saving enables it', search: 'Search GitLab repositories', searchHint: 'Search by repository name',
    searchResults: 'Available repositories', assigned: name => `Registered to ${name}`, moveHint: 'To move a repository, remove it from its current project and save first.',
    previous: 'Previous', next: 'Next', page: n => `Page ${n}`, selectRepo: name => `Select ${name}`, removeRepo: name => `Remove ${name}`,
    noSelected: 'No repositories selected.', limit: 'Select up to 200 repositories per project.',
    noRepositories: 'No repositories registered', noRepositoriesHint: 'Edit registration to connect GitLab repositories to this profile.',
    noProjects: 'Create your first project', noProjectsHint: 'Create a Hermes profile and register the GitLab repositories that should share its knowledge.',
    noResults: 'No repositories found', noResultsHint: 'Try another search, or check that the bot can access the repository.',
    preserve: 'Removing a registration keeps the Hermes profile and its knowledge.',
    configureTitle: 'Connect the GitLab bot', configureHint: 'In Messaging → GitLab, set the GitLab URL and bot PAT on this backend, then refresh this page.',
    multiplex: 'Enable gateway.multiplex_profiles in the default profile configuration before saving project registrations.',
    loading: 'Loading projects', loadError: 'Could not load GitLab projects', searchError: 'Could not load repositories', saveError: 'Registration was not saved',
    backendHint: 'Select this backend’s default profile, enable hermes-gitlab, and restart its Desktop backend.',
    reload: 'Reload registration', reloadHint: 'If configuration changed, reload the registration and review it before saving again. Reloading discards this draft.',
    saved: 'Registration saved.', restart: 'In Messaging, restart the default profile’s messaging gateway on this backend to apply route changes.',
    setup: 'No model is selected for this profile. Configure a model on this backend:',
    polling: seconds => `GitLab polling · every ${seconds}s`, backend: 'Backend', activeProfile: 'Connection profile',
    openRepo: name => `Open ${name} in GitLab`, openFailed: 'Could not open this repository link.',
    savedHint: 'Saving applies repository mappings by restarting the shared gateway.',
    autoHint: 'New projects copy project-egg’s prompts, skills, SOUL and configuration. Saving restarts the shared gateway and briefly interrupts all its bots.',
    modelReady: (model, provider) => `Model selected: ${model} · ${provider}`,
    restarting: 'Restarting the shared gateway…',
    restartFinished: 'Restart command completed. Gateway connections may still be starting.',
    restartFailed: 'Gateway restart failed. Your registration is saved; retry or check Messaging.',
    restartUnknown: 'Restart could not be confirmed. Check the gateway status in Messaging.',
    retryRestart: 'Retry gateway restart',
    deleteProject: 'Delete project',
    deleteHint: name => `This permanently deletes the Hermes profile ${name}, including its memories, sessions, credentials, skills, and repository mappings. GitLab repositories are kept. Type ${name} to confirm.`,
    deleted: name => `Project ${name} deleted. Restart required.`,
    deleteError: (name, removed) => removed ? `Registration removed, but Hermes profile ${name} was not deleted. Restart the gateway to apply the registration removal. Retry to delete the profile.` : `Project ${name} was not deleted.`,
    mappings: 'Mappings', activity: 'Activity', openEvents: n => `${n} open`,
    filterProjects: 'Filter projects or repositories', filterEvents: 'Filter events',
    allProjects: 'All projects', findProject: 'Find a project', noProjectMatch: 'No project matches.',
    all: 'All', unmapped: 'Unmapped', needsAttention: 'Needs attention', openStatus: 'Open',
    delivered: 'Delivered', pending: 'Pending', retrying: 'Retrying', failed: 'Failed',
    when: 'When', event: 'Event', lastEvent: 'Last event', noLastEvent: 'No events',
    noEvents: 'No events', noEventsHint: 'Mentions and assignments appear after the next poll.',
    recentActivity: 'Recent activity', allActivity: 'All activity', request: 'Request', dispatch: 'Dispatch',
    gitlabTodo: 'GitLab to-do', card: 'Card', session: 'Session', discussion: 'Discussion',
    attempts: 'Attempts', polled: 'Polled', relatedIssue: 'related issue',
    noDiscussion: 'None yet — assignment or description has no comment anchor.',
    mention: 'Mention', assignment: 'Assigned', justNow: 'now',
    ageMin: n => `${n}m`, ageHr: n => `${n}h`, ageDay: n => `${n}d`,
    clearProject: 'Show all projects', selectEvent: 'Select an event to see its detail.',
    loadEventsError: 'Could not load GitLab events', closeDetail: 'Close', routing: 'Routing', status: 'Status'
  },
  ja: {
    profileIdentifier: 'プロジェクトプロファイル ID',
    title: 'GitLab プロジェクト', intro: 'プロジェクトごとに Hermes プロファイルを使用します。登録リポジトリは知識を共有します。',
    projects: 'プロジェクト', newProject: '新規プロジェクト', edit: '登録を編集', save: '保存して有効化', cancel: 'キャンセル',
    refresh: '更新', retry: '再試行', messaging: 'Messaging を開く', profile: 'Hermes プロファイル', description: '説明',
    nameHint: '小文字の英数字、ハイフン、アンダースコアで1〜64文字。英数字で始めてください。',
    nameInvalid: '有効なプロジェクト名を入力してください。default、project-egg、global-project は予約済みです。',
    nameExists: 'このプロファイルは既に存在します。キャンセルして一覧から選択してください。', optional: 'プロジェクトの説明（任意）',
    repositories: '登録済みリポジトリ', selected: n => `選択したリポジトリ（${n}/200）`, count: n => `${n} リポジトリ`,
    unregistered: '未登録', missing: 'プロファイルなし', missingHint: '保存すると、project-egg のテンプレートからプロファイルを作成します。',
    disabled: 'ルート無効 · 保存で有効化', search: 'GitLab リポジトリを検索', searchHint: 'リポジトリ名で検索', searchResults: '利用可能なリポジトリ',
    assigned: name => `${name} に登録済み`, moveHint: 'リポジトリを移動するには、現在のプロジェクトから削除して先に保存してください。',
    previous: '前へ', next: '次へ', page: n => `${n} ページ`, selectRepo: name => `${name} を選択`, removeRepo: name => `${name} を削除`,
    noSelected: 'リポジトリが選択されていません。', limit: 'プロジェクトごとに最大200リポジトリを選択できます。',
    noRepositories: '登録済みリポジトリはありません', noRepositoriesHint: '登録を編集して、このプロファイルに GitLab リポジトリを接続してください。',
    noProjects: '最初のプロジェクトを作成', noProjectsHint: 'Hermes プロファイルを作成し、知識を共有する GitLab リポジトリを登録します。',
    noResults: 'リポジトリが見つかりません', noResultsHint: '検索を変更するか、ボットのアクセス権を確認してください。',
    preserve: '登録を削除しても、Hermes プロファイルと知識は保持されます。', configureTitle: 'GitLab ボットを接続',
    configureHint: 'このバックエンドの Messaging → GitLab で URL とボット PAT を設定し、このページを更新してください。',
    multiplex: '登録を保存する前に、default プロファイルの設定で gateway.multiplex_profiles を有効にしてください。',
    loading: 'プロジェクトを読み込み中', loadError: 'GitLab プロジェクトを読み込めません', searchError: 'リポジトリを読み込めません', saveError: '登録は保存されませんでした',
    backendHint: 'このバックエンドの default プロファイルを選択し、hermes-gitlab を有効にして Desktop バックエンドを再起動してください。',
    reload: '登録を再読み込み', reloadHint: '設定が変更された場合は、登録を再読み込みして内容を確認してください。編集中の内容は破棄されます。',
    saved: '登録を保存しました。', restart: '変更を適用するには、Messaging でこのバックエンドの default プロファイルのメッセージングゲートウェイを再起動してください。',
    setup: 'このプロファイルにはモデルが選択されていません。このバックエンドで設定してください：', polling: seconds => `GitLab ポーリング · ${seconds}秒ごと`,
    backend: 'バックエンド', activeProfile: '接続プロファイル', openRepo: name => `GitLab で ${name} を開く`, openFailed: 'リポジトリのリンクを開けませんでした。',
    savedHint: '保存すると、共有ゲートウェイを再起動して登録を適用します。',
    autoHint: '新規プロジェクトは project-egg のプロンプト、スキル、SOUL、設定をコピーします。保存すると共有ゲートウェイが再起動し、すべてのボットが一時停止します。',
    modelReady: (model, provider) => `選択したモデル：${model} · ${provider}`,
    restarting: '共有ゲートウェイを再起動中…',
    restartFinished: '再起動コマンドが完了しました。ゲートウェイ接続はまだ開始中の場合があります。',
    restartFailed: 'ゲートウェイの再起動に失敗しました。登録は保存済みです。再試行するか Messaging を確認してください。',
    restartUnknown: '再起動を確認できませんでした。Messaging で状態を確認してください。',
    retryRestart: 'ゲートウェイの再起動を再試行',
    deleteProject: 'プロジェクトを削除',
    deleteHint: name => `Hermes プロファイル ${name} と、そのメモリ、セッション、認証情報、スキル、リポジトリの登録を完全に削除します。GitLab リポジトリは保持されます。確認のため ${name} と入力してください。`,
    deleted: name => `プロジェクト ${name} を削除しました。再起動が必要です。`,
    deleteError: (name, removed) => removed ? `登録を削除しましたが、Hermes プロファイル ${name} は削除されませんでした。ゲートウェイを再起動して登録の削除を適用してください。再試行するとプロファイルを削除します。` : `プロジェクト ${name} は削除されませんでした。`,
    mappings: '登録', activity: 'アクティビティ', openEvents: n => `${n} 件未完了`,
    filterProjects: 'プロジェクトまたはリポジトリを絞り込み', filterEvents: 'イベントを絞り込み',
    allProjects: 'すべてのプロジェクト', findProject: 'プロジェクトを検索', noProjectMatch: '一致するプロジェクトはありません。',
    all: 'すべて', unmapped: '未登録', needsAttention: '要対応', openStatus: '未完了',
    delivered: '配信済み', pending: '保留', retrying: '再試行中', failed: '失敗',
    when: '時刻', event: 'イベント', lastEvent: '最新イベント', noLastEvent: 'イベントなし',
    noEvents: 'イベントはありません', noEventsHint: 'メンションとアサインは次回のポーリング後に表示されます。',
    recentActivity: '最近のアクティビティ', allActivity: 'すべてのアクティビティ', request: 'リクエスト', dispatch: '配信',
    gitlabTodo: 'GitLab To-do', card: 'カード', session: 'セッション', discussion: 'ディスカッション',
    attempts: '試行', polled: '取得', relatedIssue: '関連イシュー',
    noDiscussion: 'まだありません。アサインや説明にはコメントの起点がありません。',
    mention: 'メンション', assignment: 'アサイン', justNow: 'たった今',
    ageMin: n => `${n}分`, ageHr: n => `${n}時間`, ageDay: n => `${n}日`,
    clearProject: 'すべてのプロジェクトを表示', selectEvent: 'イベントを選ぶと詳細が表示されます。',
    loadEventsError: 'GitLab イベントを読み込めません', closeDetail: '閉じる', routing: 'ルーティング中', status: '状態'
  },
  zh: {
    profileIdentifier: '项目配置文件 ID',
    title: 'GitLab 项目', intro: '每个项目使用一个 Hermes 配置文件。已注册的仓库共享其知识。',
    projects: '项目', newProject: '新建项目', edit: '编辑注册', save: '保存并启用', cancel: '取消', refresh: '刷新', retry: '重试',
    messaging: '打开 Messaging', profile: 'Hermes 配置文件', description: '描述', nameHint: '使用1–64个小写字母、数字、连字符或下划线，以字母或数字开头。',
    nameInvalid: '请输入有效的项目名称；default、project-egg 和 global-project 为保留名称。', nameExists: '此配置文件已存在。请取消并从项目列表选择它。', optional: '项目说明（可选）',
    repositories: '已注册仓库', selected: n => `已选仓库（${n}/200）`, count: n => `${n} 个仓库`, unregistered: '未注册', missing: '配置文件缺失',
    missingHint: '保存将从 project-egg 模板复制此配置文件。', disabled: '路由已禁用 · 保存将启用',
    search: '搜索 GitLab 仓库', searchHint: '按仓库名称搜索', searchResults: '可用仓库', assigned: name => `已注册到 ${name}`,
    moveHint: '要移动仓库，请先将其从当前项目中移除并保存。', previous: '上一页', next: '下一页', page: n => `第 ${n} 页`,
    selectRepo: name => `选择 ${name}`, removeRepo: name => `移除 ${name}`, noSelected: '尚未选择仓库。', limit: '每个项目最多可选择200个仓库。',
    noRepositories: '尚未注册仓库', noRepositoriesHint: '编辑注册，将 GitLab 仓库连接到此配置文件。',
    noProjects: '创建第一个项目', noProjectsHint: '创建 Hermes 配置文件，注册需要共享知识的 GitLab 仓库。',
    noResults: '未找到仓库', noResultsHint: '请尝试其他搜索词，或检查机器人是否有权访问仓库。', preserve: '移除注册会保留 Hermes 配置文件及其知识。',
    configureTitle: '连接 GitLab 机器人', configureHint: '在此后端的 Messaging → GitLab 中设置 GitLab URL 和机器人 PAT，然后刷新此页面。',
    multiplex: '保存项目前，请在 default 配置文件中启用 gateway.multiplex_profiles。', loading: '正在加载项目', loadError: '无法加载 GitLab 项目',
    searchError: '无法加载仓库', saveError: '注册未保存', reload: '重新加载注册', reloadHint: '如果配置已更改，请重新加载注册并检查后再保存。重新加载会丢弃此草稿。',
    backendHint: '请选择此后端的 default 配置文件，启用 hermes-gitlab，然后重启其 Desktop 后端。',
    saved: '注册已保存。', restart: '请在 Messaging 中重启此后端 default 配置文件的消息网关，以应用路由更改。',
    setup: '此配置文件尚未选择模型。请在此后端配置：', polling: seconds => `GitLab 轮询 · 每 ${seconds} 秒`, backend: '后端', activeProfile: '连接配置文件',
    openRepo: name => `在 GitLab 中打开 ${name}`, openFailed: '无法打开此仓库链接。', savedHint: '保存将重启共享网关以应用仓库注册。',
    autoHint: '新项目复制 project-egg 的提示词、技能、SOUL 和配置。保存会重启共享网关，并短暂中断其所有机器人。',
    modelReady: (model, provider) => `已选模型：${model} · ${provider}`,
    restarting: '正在重启共享网关…',
    restartFinished: '重启命令已完成。网关连接可能仍在启动。',
    restartFailed: '网关重启失败。注册已保存；请重试或查看 Messaging。',
    restartUnknown: '无法确认重启。请在 Messaging 中查看网关状态。',
    retryRestart: '重试网关重启',
    deleteProject: '删除项目',
    deleteHint: name => `这将永久删除 Hermes 配置文件 ${name}，包括其记忆、会话、凭据、技能和仓库注册。GitLab 仓库将保留。请输入 ${name} 以确认。`,
    deleted: name => `项目 ${name} 已删除。需要重启。`,
    deleteError: (name, removed) => removed ? `注册已移除，但 Hermes 配置文件 ${name} 未删除。请重启网关以应用注册移除。重试以删除配置文件。` : `项目 ${name} 未删除。`,
    mappings: '注册', activity: '动态', openEvents: n => `${n} 条未完成`,
    filterProjects: '筛选项目或仓库', filterEvents: '筛选事件',
    allProjects: '全部项目', findProject: '查找项目', noProjectMatch: '没有匹配的项目。',
    all: '全部', unmapped: '未注册', needsAttention: '需处理', openStatus: '未完成',
    delivered: '已送达', pending: '待处理', retrying: '重试中', failed: '失败',
    when: '时间', event: '事件', lastEvent: '最近事件', noLastEvent: '无事件',
    noEvents: '暂无事件', noEventsHint: '提及和指派会在下次轮询后出现。',
    recentActivity: '最近动态', allActivity: '全部动态', request: '请求', dispatch: '投递',
    gitlabTodo: 'GitLab 待办', card: '卡片', session: '会话', discussion: '讨论',
    attempts: '尝试', polled: '采集', relatedIssue: '相关议题',
    noDiscussion: '尚无讨论。指派或描述没有评论锚点。',
    mention: '提及', assignment: '指派', justNow: '刚刚',
    ageMin: n => `${n} 分钟`, ageHr: n => `${n} 小时`, ageDay: n => `${n} 天`,
    clearProject: '显示全部项目', selectEvent: '选择事件以查看详情。',
    loadEventsError: '无法加载 GitLab 事件', closeDetail: '关闭', routing: '路由中', status: '状态'
  },
  'zh-hant': {
    profileIdentifier: '專案設定檔 ID',
    title: 'GitLab 專案', intro: '每個專案使用一個 Hermes 設定檔。已註冊的儲存庫共用其知識。',
    projects: '專案', newProject: '新增專案', edit: '編輯註冊', save: '儲存並啟用', cancel: '取消', refresh: '重新整理', retry: '重試',
    messaging: '開啟 Messaging', profile: 'Hermes 設定檔', description: '說明', nameHint: '使用1–64個小寫字母、數字、連字號或底線，以字母或數字開頭。',
    nameInvalid: '請輸入有效的專案名稱；default、project-egg 與 global-project 為保留名稱。', nameExists: '此設定檔已存在。請取消並從專案清單選取。', optional: '專案說明（選填）',
    repositories: '已註冊儲存庫', selected: n => `已選儲存庫（${n}/200）`, count: n => `${n} 個儲存庫`, unregistered: '未註冊', missing: '設定檔不存在',
    missingHint: '儲存將從 project-egg 範本複製此設定檔。', disabled: '路由已停用 · 儲存將啟用',
    search: '搜尋 GitLab 儲存庫', searchHint: '依儲存庫名稱搜尋', searchResults: '可用儲存庫', assigned: name => `已註冊至 ${name}`,
    moveHint: '要移動儲存庫，請先從目前專案移除並儲存。', previous: '上一頁', next: '下一頁', page: n => `第 ${n} 頁`,
    selectRepo: name => `選取 ${name}`, removeRepo: name => `移除 ${name}`, noSelected: '尚未選取儲存庫。', limit: '每個專案最多可選取200個儲存庫。',
    noRepositories: '尚未註冊儲存庫', noRepositoriesHint: '編輯註冊，將 GitLab 儲存庫連接至此設定檔。',
    noProjects: '建立第一個專案', noProjectsHint: '建立 Hermes 設定檔，註冊需要共用知識的 GitLab 儲存庫。',
    noResults: '找不到儲存庫', noResultsHint: '請嘗試其他搜尋詞，或檢查機器人是否有權存取儲存庫。', preserve: '移除註冊會保留 Hermes 設定檔及其知識。',
    configureTitle: '連接 GitLab 機器人', configureHint: '在此後端的 Messaging → GitLab 設定 GitLab URL 和機器人 PAT，然後重新整理此頁面。',
    multiplex: '儲存專案前，請在 default 設定檔中啟用 gateway.multiplex_profiles。', loading: '正在載入專案', loadError: '無法載入 GitLab 專案',
    searchError: '無法載入儲存庫', saveError: '註冊未儲存', reload: '重新載入註冊', reloadHint: '若設定已變更，請重新載入註冊並檢查後再儲存。重新載入將捨棄此草稿。',
    backendHint: '請選取此後端的 default 設定檔，啟用 hermes-gitlab，然後重新啟動其 Desktop 後端。',
    saved: '註冊已儲存。', restart: '請在 Messaging 重新啟動此後端 default 設定檔的訊息閘道，以套用路由變更。',
    setup: '此設定檔尚未選取模型。請在此後端設定：', polling: seconds => `GitLab 輪詢 · 每 ${seconds} 秒`, backend: '後端', activeProfile: '連線設定檔',
    openRepo: name => `在 GitLab 開啟 ${name}`, openFailed: '無法開啟此儲存庫連結。', savedHint: '儲存將重新啟動共用閘道以套用儲存庫註冊。',
    autoHint: '新專案複製 project-egg 的提示詞、技能、SOUL 和設定。儲存會重新啟動共用閘道，並短暫中斷其所有機器人。',
    modelReady: (model, provider) => `已選模型：${model} · ${provider}`,
    restarting: '正在重新啟動共用閘道…',
    restartFinished: '重新啟動命令已完成。閘道連線可能仍在啟動。',
    restartFailed: '閘道重新啟動失敗。註冊已儲存；請重試或查看 Messaging。',
    restartUnknown: '無法確認重新啟動。請在 Messaging 中查看閘道狀態。',
    retryRestart: '重試重新啟動閘道',
    deleteProject: '刪除專案',
    deleteHint: name => `這將永久刪除 Hermes 設定檔 ${name}，包括其記憶、工作階段、憑證、技能與儲存庫註冊。GitLab 儲存庫將保留。請輸入 ${name} 以確認。`,
    deleted: name => `專案 ${name} 已刪除。需要重新啟動。`,
    deleteError: (name, removed) => removed ? `註冊已移除，但 Hermes 設定檔 ${name} 未刪除。請重新啟動閘道以套用註冊移除。重試以刪除設定檔。` : `專案 ${name} 未刪除。`,
    mappings: '註冊', activity: '活動', openEvents: n => `${n} 筆未完成`,
    filterProjects: '篩選專案或儲存庫', filterEvents: '篩選事件',
    allProjects: '全部專案', findProject: '尋找專案', noProjectMatch: '沒有符合的專案。',
    all: '全部', unmapped: '未註冊', needsAttention: '需處理', openStatus: '未完成',
    delivered: '已送達', pending: '待處理', retrying: '重試中', failed: '失敗',
    when: '時間', event: '事件', lastEvent: '最近事件', noLastEvent: '無事件',
    noEvents: '尚無事件', noEventsHint: '提及與指派會在下次輪詢後出現。',
    recentActivity: '最近活動', allActivity: '全部活動', request: '請求', dispatch: '投遞',
    gitlabTodo: 'GitLab 待辦', card: '卡片', session: '工作階段', discussion: '討論',
    attempts: '嘗試', polled: '擷取', relatedIssue: '相關議題',
    noDiscussion: '尚無討論。指派或說明沒有留言錨點。',
    mention: '提及', assignment: '指派', justNow: '剛剛',
    ageMin: n => `${n} 分鐘`, ageHr: n => `${n} 小時`, ageDay: n => `${n} 天`,
    clearProject: '顯示全部專案', selectEvent: '選取事件以查看詳細資料。',
    loadEventsError: '無法載入 GitLab 事件', closeDetail: '關閉', routing: '路由中', status: '狀態'
  }
}

const css = `
.hgl { height:100%; min-height:0; display:flex; flex-direction:column; overflow:hidden; container-type:inline-size; color:var(--ui-text-primary); font-size:.8125rem; line-height:1.5; }
.hgl *, .hgl *::before, .hgl *::after { box-sizing:border-box; }
.hgl h1,.hgl h2,.hgl h3,.hgl p { margin:0; }
.hgl h1 { font-size:1.25rem; font-weight:600; letter-spacing:-.02em; }
.hgl h2 { font-size:1rem; font-weight:600; overflow-wrap:anywhere; }
.hgl h3 { font-size:.8125rem; font-weight:600; }
.hgl p { max-width:72ch; text-wrap:pretty; }
.hgl-head { flex-shrink:0; padding:22px 28px 0; }
.hgl-tabs { display:flex; gap:4px; margin-top:18px; border-bottom:1px solid var(--ui-stroke-secondary); }
.hgl-tab { appearance:none; border:0; background:transparent; color:var(--ui-text-secondary); font:inherit; font-weight:500; padding:10px 4px 12px; margin-right:16px; margin-bottom:-1px; border-bottom:2px solid transparent; cursor:pointer; }
.hgl-tab[aria-selected=true] { color:var(--ui-text-primary); border-bottom-color:var(--ui-accent); }
.hgl-tab:focus-visible { outline:2px solid var(--ui-accent); outline-offset:2px; }
.hgl-tab:disabled { opacity:.55; cursor:default; }
.hgl-tab-count { margin-left:6px; color:var(--ui-text-secondary); font-weight:400; font-variant-numeric:tabular-nums; }
/* Native checkboxes include absolute hidden inputs; contain them in the scrolling body. */
.hgl-body { position:relative; flex:1; min-height:0; overflow:hidden; overscroll-behavior:none; display:flex; flex-direction:column; }
.hgl-panel { flex:1; min-height:0; display:flex; flex-direction:column; }
.hgl-toolbar { flex-shrink:0; display:flex; gap:12px; align-items:center; flex-wrap:wrap; padding:14px 28px 16px; border-bottom:1px solid var(--ui-stroke-secondary); }
.hgl-toolbar .hgl-search { flex:1; min-width:180px; max-width:360px; }
.hgl-toolbar .hgl-select { min-width:11rem; max-width:16rem; }
.hgl-toolbar .hgl-primary { margin-left:auto; }
.hgl-split { flex:1; min-height:0; display:grid; grid-template-columns:minmax(0,1fr); }
.hgl-split.draw { grid-template-columns:minmax(0,1fr) minmax(280px,36%); }
.hgl-table-wrap { min-height:0; overflow:auto; }
.hgl-table { width:100%; border-collapse:collapse; font-size:.8125rem; }
.hgl-table th { text-align:left; font-size:.6875rem; font-weight:600; color:var(--ui-text-secondary); padding:12px 20px; border-bottom:1px solid var(--ui-stroke-secondary); position:sticky; top:0; background:var(--ui-bg-editor); }
.hgl-table td { padding:14px 20px; border-bottom:1px solid var(--ui-stroke-secondary); vertical-align:middle; }
.hgl-row { cursor:pointer; }
.hgl-row:hover td { background:var(--ui-row-hover-background); }
.hgl-row[aria-current=true] td { background:var(--ui-row-active-background); }
.hgl-row:focus-visible { outline:2px solid var(--ui-accent); outline-offset:-2px; }
.hgl-drawer { position:relative; border-left:1px solid var(--ui-stroke-secondary); overflow:auto; padding:24px; display:flex; flex-direction:column; gap:16px; min-width:0; }
.hgl-drawer-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.hgl-drawer-head .hgl-stack { flex:1; min-width:0; padding-right:8px; }
.hgl-drawer-close { flex:none; margin:-8px -8px 0 0; }
.hgl-stack { display:flex; flex-direction:column; gap:12px; min-width:0; }
.hgl-subtle { color:var(--ui-text-secondary); font-size:.75rem; }
.hgl-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; }
.hgl-drawer-actions { display:flex; gap:8px; width:100%; }
.hgl-drawer-actions > * { flex:1 1 0; min-width:0; }
.hgl-drawer-actions button { width:100%; justify-content:center; }
.hgl-notice { flex-shrink:0; margin:16px 28px 0; padding:12px 14px; border:1px solid var(--ui-stroke-secondary); border-radius:4px; display:flex; flex-direction:column; gap:8px; background:var(--ui-bg-quaternary); }
.hgl-form { display:flex; flex-direction:column; gap:20px; padding:20px 28px 28px; overflow:auto; }
.hgl-field { display:flex; flex-direction:column; gap:6px; max-width:560px; }
.hgl-field label { font-size:.75rem; font-weight:500; }
.hgl-field input { width:100%; }
.hgl-list { list-style:none; padding:0; margin:0; }
.hgl-repo { display:flex; align-items:center; gap:10px; min-width:0; padding:10px 0; border-bottom:1px solid var(--ui-stroke-secondary); }
.hgl-repo-copy { display:flex; flex:1; min-width:0; flex-direction:column; gap:2px; overflow-wrap:anywhere; }
.hgl-repo-copy label { cursor:pointer; }
.hgl-repo-id { font-variant-numeric:tabular-nums; color:var(--ui-text-secondary); font-size:.6875rem; }
.hgl-search { width:100%; }
.hgl-pagination { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.hgl-footer { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; border-top:1px solid var(--ui-stroke-secondary); padding-top:16px; }
.hgl-status { font-weight:500; }
.hgl-error { color:var(--destructive); overflow-wrap:anywhere; }
.hgl-center { padding:36px 28px; }
.hgl-skeleton { height:24px; margin:12px 0; }
.hgl code { overflow-wrap:anywhere; font-size:.75rem; }
.hgl-pill { display:inline-flex; align-items:center; padding:2px 7px; border-radius:3px; font-size:.6875rem; font-weight:500; background:var(--ui-bg-quaternary); color:var(--ui-text-secondary); }
.hgl-pill-ok { background:color-mix(in srgb, #10b981 16%, transparent); color:#0b7a56; }
.hgl-pill-warn { background:color-mix(in srgb, #f59e0b 16%, transparent); color:#b45309; }
.hgl-pill-bad { background:color-mix(in srgb, var(--destructive) 16%, transparent); color:var(--destructive); }
.hgl-muted { color:var(--ui-text-secondary); }
.hgl-dl { display:grid; grid-template-columns:118px minmax(0,1fr); gap:6px 12px; font-size:.75rem; }
.hgl-dl dt { color:var(--ui-text-secondary); }
.hgl-dl dd { margin:0; overflow-wrap:anywhere; }
.hgl-pre { padding:10px 12px; border:1px solid var(--ui-stroke-secondary); border-radius:6px; white-space:pre-wrap; }
.hgl-glyph { width:18px; height:18px; border-radius:4px; display:grid; place-items:center; font-size:.625rem; font-weight:700; text-transform:uppercase; background:var(--ui-bg-quaternary); color:var(--ui-text-secondary); flex-shrink:0; }
.hgl-recent { display:flex; flex-direction:column; gap:2px; }
.hgl-recent button { appearance:none; border:0; background:transparent; text-align:left; cursor:pointer; padding:8px; border-radius:5px; display:grid; grid-template-columns:1fr auto; gap:4px 8px; color:inherit; font:inherit; width:100%; }
.hgl-recent button:hover { background:var(--ui-row-hover-background); }
@container (max-width:650px) {
  .hgl-head { padding:16px 20px 0; }
  .hgl-toolbar, .hgl-form { padding-left:20px; padding-right:20px; }
  .hgl-notice { margin:12px 20px 0; }
  .hgl-split.draw { grid-template-columns:1fr; }
  .hgl-drawer { border-left:0; border-top:1px solid var(--ui-stroke-secondary); max-height:50%; }
  .hgl-table th, .hgl-table td { padding-left:16px; padding-right:16px; }
}
@media (prefers-reduced-motion:reduce) { .hgl * { animation:none!important; transition:none!important; } }
`

const scopeNow = () => JSON.stringify([host.state.connectionId.get(), host.state.profile.get()])
const errorText = error => error instanceof Error ? error.message : String(error)
const makeDraft = (project, revision) => ({
  profile: project?.profile || '', description: project?.description || '', revision,
  repositories: Object.fromEntries((project?.repositories || []).map(repo => [repo.id, repo])), isNew: !project
})
const RESERVED = ['default', 'project-egg', 'global-project']
const projectStatus = (row, t) => !row.available ? t('missing') : row.repositories.length ? t('count', row.repositories.length) : t('unregistered')
const eventKind = (event, t) => event.command || (event.action === 'assigned' || event.kind === 'assignment' ? t('assignment') : t('mention'))
const cardRef = event => event.iid ? `${event.target_type === 'MergeRequest' ? '!' : '#'}${event.iid}` : ''
const age = (iso, t) => {
  const ms = Date.now() - Date.parse(iso)
  if (!Number.isFinite(ms)) return ''
  const minutes = Math.max(0, Math.round(ms / 60000))
  if (minutes < 1) return t('justNow')
  if (minutes < 60) return t('ageMin', minutes)
  const hours = Math.round(minutes / 60)
  if (hours < 48) return t('ageHr', hours)
  return t('ageDay', Math.round(hours / 24))
}
const pill = (status, label) => jsx('span', { className: `hgl-pill${{ delivered: ' hgl-pill-ok', pending: ' hgl-pill-warn', retrying: ' hgl-pill-warn', failed: ' hgl-pill-bad' }[status] || ''}`, children: label })
const glyph = name => jsx('span', { className: 'hgl-glyph', 'aria-hidden': true, children: (name || '?')[0] })

function Repository({ ctx, repo, children }) {
  const t = usePluginI18n(ID)
  let safeUrl
  try {
    const url = new URL(repo.url)
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) safeUrl = url.href
  } catch { /* Older registrations may not have a URL yet. */ }
  return jsxs('li', { className: 'hgl-repo', children: [
    jsx('div', { className: 'hgl-repo-copy', children: [
      jsx('span', { children: repo.name }, 'name'),
      jsx('span', { className: 'hgl-repo-id', children: `#${repo.id}` }, 'id'),
      repo.enabled === false && jsx('span', { className: 'hgl-subtle', children: t('disabled') }, 'disabled')
    ] }),
    safeUrl && jsx(Button, { type: 'button', variant: 'ghost', size: 'icon-xs', 'aria-label': t('openRepo', repo.name),
      onClick: async () => { if (!await ctx.os.openExternal(safeUrl)) host.notify({ kind: 'error', message: t('openFailed') }) },
      children: jsx(Codicon, { name: 'link-external', size: '.875rem' }) }), children
  ] })
}

function RepositoryPicker({ ctx, scope, projects, draft, setDraft, busy }) {
  const t = usePluginI18n(ID)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search); setPage(1) }, 250)
    return () => clearTimeout(timer)
  }, [search])
  const result = useQuery({ queryKey: [ID, scope, 'repositories', query, page], retry: false,
    queryFn: () => {
      if (scopeNow() !== scope) throw new Error('Backend changed')
      return ctx.rest(`/repositories?q=${encodeURIComponent(query)}&page=${page}`)
    }
  })
  const owners = new Map(projects.flatMap(project => project.repositories.map(repo => [repo.id, project.profile])))
  const count = Object.keys(draft.repositories).length
  const toggle = (repo, checked) => setDraft(current => {
    if (!current || busy) return current
    const repositories = { ...current.repositories }
    if (checked && Object.keys(repositories).length < 200) repositories[repo.id] = repo
    else if (!checked) delete repositories[repo.id]
    return { ...current, repositories }
  })
  return jsxs('section', { className: 'hgl-stack', children: [
    jsx('h3', { children: t('selected', count) }),
    count ? jsx('ul', { className: 'hgl-list', children: Object.values(draft.repositories).map(repo => jsx(Repository, {
      ctx, repo, children: jsx(Button, { type: 'button', variant: 'ghost', size: 'icon-xs', disabled: busy,
        'aria-label': t('removeRepo', repo.name), onClick: () => toggle(repo, false), children: jsx(Codicon, { name: 'close', size: '.875rem' }) })
    }, repo.id)) }) : jsx('p', { className: 'hgl-subtle', children: t('noSelected') }),
    count >= 200 && jsx('p', { role: 'status', className: 'hgl-subtle', children: t('limit') }),
    jsx('h3', { children: t('searchResults') }),
    jsx(Input, { 'aria-label': t('search'), placeholder: t('searchHint'), value: search, className: 'hgl-search',
      onChange: event => setSearch(event.target.value.slice(0, 200)) }),
    result.isPending ? jsx(Skeleton, { className: 'hgl-skeleton' }) : result.isError ? jsxs('div', { role: 'alert', className: 'hgl-stack', children: [
      jsx('p', { className: 'hgl-error', children: `${t('searchError')}: ${errorText(result.error)}` }),
      jsx(Button, { type: 'button', variant: 'outline', onClick: () => result.refetch(), children: t('retry') })
    ] }) : result.data.repositories.length ? jsx('ul', { className: 'hgl-list', children: result.data.repositories.map(repo => {
      const owner = owners.get(repo.id)
      const elsewhere = owner && owner !== draft.profile
      const checked = Boolean(draft.repositories[repo.id])
      const id = `hgl-repo-${repo.id}`
      return jsxs('li', { className: 'hgl-repo', children: [
        jsx(Checkbox, { id, checked, disabled: busy || Boolean(elsewhere) || (!checked && count >= 200),
          'aria-label': t('selectRepo', repo.name), onCheckedChange: value => toggle(repo, value === true) }),
        jsxs('div', { className: 'hgl-repo-copy', children: [
          jsx('label', { htmlFor: id, children: repo.name }),
          jsx('span', { className: 'hgl-repo-id', children: `#${repo.id}` }),
          owner && jsx('span', { className: 'hgl-subtle', children: t('assigned', owner) })
        ] })
      ] }, repo.id)
    }) }) : jsx(EmptyState, { title: t('noResults'), description: t('noResultsHint') }),
    jsxs('div', { className: 'hgl-pagination', children: [
      jsx(Button, { type: 'button', variant: 'outline', disabled: page === 1 || result.isFetching, onClick: () => setPage(value => value - 1), children: t('previous') }),
      jsx('span', { className: 'hgl-subtle', 'aria-live': 'polite', children: t('page', page) }),
      jsx(Button, { type: 'button', variant: 'outline', disabled: !result.data?.next_page || result.isFetching,
        onClick: () => setPage(result.data.next_page), children: t('next') })
    ] }),
    jsx('p', { className: 'hgl-subtle', children: t('moveHint') })
  ] })
}

function ProjectsContent({ ctx, scope, connectionId, connectionProfile }) {
  const t = usePluginI18n(ID)
  const client = useQueryClient()
  const queryKey = [ID, scope, 'projects']
  const result = useQuery({ queryKey, retry: false, queryFn: () => {
    if (scopeNow() !== scope) throw new Error('Backend changed')
    return ctx.rest('/projects')
  } })
  const [selected, setSelected] = useState(null)
  const [inspect, setInspect] = useState(null)
  const [pane, setPane] = useState('mappings')
  const [mapQuery, setMapQuery] = useState('')
  const [mapFilter, setMapFilter] = useState('all')
  const [projectScope, setProjectScope] = useState('all')
  const [eventStatus, setEventStatus] = useState('all')
  const [eventQuery, setEventQuery] = useState('')
  const [eventPage, setEventPage] = useState(1)
  const [draft, setDraft] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(null)
  const mounted = useRef(true)
  const saving = useRef(false)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const current = () => mounted.current && scopeNow() === scope
  const restart = useQuery({
    queryKey: [ID, scope, 'restart', saved?.restart_pid, saved?.restartAt], retry: false,
    enabled: Boolean(saved?.restart_started && !saved?.deleted),
    queryFn: async () => {
      if (!current()) throw new Error('Backend changed')
      const response = await ctx.rest(`/gateway/restart/status?pid=${saved.restart_pid}`)
      // Foreground gateways may keep the restart child alive indefinitely.
      return response.status === 'running' && Date.now() - saved.restartAt > 30000 ? { status: 'unknown' } : response
    },
    refetchInterval: query => query.state.data?.status === 'running' ? 1200 : false
  })
  const restartState = !saved?.restart_started ? 'failed' : restart.isError ? 'unknown' : restart.data?.status || 'running'
  const retryRestart = async () => {
    if (saving.current || !current()) return
    saving.current = true
    setBusy(true)
    try {
      const response = await ctx.rest('/gateway/restart', { method: 'POST', timeoutMs: 120000 })
      if (current()) setSaved(value => ({ ...value, ...response, restartAt: Date.now() }))
    } catch {
      if (current()) setSaved(value => ({ ...value, restart_started: false }))
    } finally {
      saving.current = false
      if (current()) setBusy(false)
    }
  }
  const data = result.data
  const projects = data?.projects || []
  const project = projects.find(row => row.profile === (draft && !draft.isNew ? draft.profile : selected))
  const name = draft?.profile.trim().toLowerCase() || ''
  const nameError = draft?.isNew && name ?
    (!/^[a-z0-9][a-z0-9_-]{0,63}$/.test(name) || RESERVED.includes(name) ? t('nameInvalid') :
      projects.some(row => row.profile === name) ? t('nameExists') : null) : null
  const eventsKey = [ID, scope, 'events', pane === 'activity' ? projectScope : selected, pane === 'activity' ? eventStatus : 'all',
    pane === 'activity' ? eventQuery : '', pane === 'activity' ? eventPage : 1]
  const events = useQuery({
    queryKey: eventsKey, retry: false,
    enabled: Boolean(data) && (pane === 'activity' || inspect?.type === 'project'),
    queryFn: () => {
      if (scopeNow() !== scope) throw new Error('Backend changed')
      const params = new URLSearchParams()
      const profile = pane === 'activity' ? projectScope : selected
      if (profile && profile !== 'all') params.set('profile', profile)
      if (pane === 'activity' && eventStatus !== 'all') params.set('status', eventStatus)
      if (pane === 'activity' && eventQuery.trim()) params.set('q', eventQuery.trim())
      if (pane === 'activity') params.set('page', String(eventPage))
      return ctx.rest(`/events?${params}`)
    }
  })
  const start = row => {
    if (saving.current) return
    setDraft(makeDraft(row, data.revision)); setError(null); setSaved(null)
  }
  const remove = async event => {
    event.preventDefault()
    if (saving.current || !current() || !deleting || deleting.confirmation !== deleting.profile || RESERVED.includes(deleting.profile)) return
    const target = { ...deleting, scope: scopeNow() }
    saving.current = true
    setBusy(true)
    setError(null)
    let removed = false
    try {
      const response = await ctx.rest(`/projects/${encodeURIComponent(target.profile)}`, { method: 'DELETE', timeoutMs: 120000,
        body: { revision: target.revision, confirmation: target.confirmation } })
      removed = true
      // The native method captures its ambient backend synchronously. Never call it after a scope switch.
      if (!current() || scopeNow() !== target.scope) {
        host.notify({ kind: 'error', message: `${t('deleteError', target.profile, true)} ${t('backend')}: ${connectionId || 'local'}` })
        return
      }
      if (response.profile_delete_required) await host.deleteProfile(target.profile)
      if (!current()) return
      setSaved({ ...response, deleted: true })
      setDeleting(null)
      setSelected(null)
      setInspect(null)
      await client.invalidateQueries({ queryKey })
      await client.invalidateQueries({ queryKey: [ID, scope, 'events'] })
    } catch (failure) {
      if (!current()) return
      setError(`${t('deleteError', target.profile, removed)} ${errorText(failure)}`)
      const refreshed = await result.refetch()
      if (current()) setDeleting(value => value && { ...value, confirmation: '',
        revision: refreshed.isError ? null : refreshed.data?.revision })
    } finally {
      saving.current = false
      if (current()) setBusy(false)
    }
  }
  const save = async event => {
    event.preventDefault()
    if (saving.current || !current() || !draft || !name || nameError || !data.connection_configured || !data.multiplex_enabled) return
    saving.current = true
    setBusy(true)
    setError(null)
    try {
      const response = await ctx.rest(`/projects/${encodeURIComponent(name)}`, { method: 'PUT', timeoutMs: 120000,
        body: { repositories: Object.keys(draft.repositories), revision: draft.revision,
          ...(draft.isNew || !project?.available ? { description: draft.description } : {}) } })
      if (!current()) return
      setSaved({ ...response, restartAt: Date.now() })
      setSelected(response.profile)
      setInspect({ type: 'project', profile: response.profile })
      setPane('mappings')
      setDraft(null)
      await client.invalidateQueries({ queryKey })
      await client.invalidateQueries({ queryKey: [ID, scope, 'events'] })
    } catch (failure) {
      if (current()) setError(errorText(failure))
    } finally {
      saving.current = false
      if (current()) setBusy(false)
    }
  }
  const reloadDraft = async () => {
    const refreshed = await result.refetch()
    if (!current() || !refreshed.data || refreshed.isError) return
    const latest = refreshed.data.projects.find(row => row.profile === name)
    setDraft(latest ? makeDraft(latest, refreshed.data.revision) : { ...makeDraft(null, refreshed.data.revision), profile: name })
    setError(null)
  }
  const messaging = jsx(Button, { type: 'button', variant: 'outline', onClick: () => host.navigate('/messaging'), children: t('messaging') })
  const locked = busy || Boolean(draft || deleting)
  const needle = mapQuery.trim().toLowerCase()
  const visible = projects.filter(row => {
    if (mapFilter === 'empty' && row.repositories.length) return false
    if (mapFilter === 'issue' && row.available && !row.repositories.some(repo => repo.enabled === false)) return false
    return !needle || row.profile.includes(needle) || row.repositories.some(repo => repo.name.toLowerCase().includes(needle))
  })
  const eventRows = events.data?.events || []
  const inspectProject = inspect?.type === 'project' ? projects.find(row => row.profile === inspect.profile) : null
  const inspectEvent = inspect?.type === 'event' ? inspect.event : null
  const openCount = data?.open_count || events.data?.open_count || 0
  const switchPane = next => {
    if (locked) return
    setPane(next)
    setInspect(null)
    setEventPage(1)
  }
  const lastCell = row => {
    const last = row.last_event
    if (!last) return jsx('span', { className: 'hgl-muted', children: t('noLastEvent') })
    return jsxs('span', { children: [pill(last.status, t(last.status)), ' ', jsx('span', { className: 'hgl-subtle', children: `${age(last.created_at, t)} · ${eventKind(last, t)} ${cardRef(last)}` })] })
  }
  const editor = draft && jsxs('form', { className: 'hgl-form', onSubmit: save, children: [
    jsx('h2', { children: draft.isNew ? t('newProject') : draft.profile }),
    draft.isNew && jsxs('div', { className: 'hgl-field', children: [
      jsx('label', { htmlFor: 'hgl-profile', children: t('profile') }),
      jsx(Input, { id: 'hgl-profile', value: draft.profile, autoFocus: true, required: true, maxLength: 64, disabled: busy,
        'aria-invalid': Boolean(nameError), 'aria-describedby': 'hgl-name-hint', onChange: event => setDraft(value => ({ ...value, profile: event.target.value })) }),
      jsx('p', { id: 'hgl-name-hint', className: nameError ? 'hgl-error' : 'hgl-subtle', children: nameError || t('nameHint') })
    ] }),
    !draft.isNew && !project?.available && jsx('p', { className: 'hgl-subtle', children: t('missingHint') }),
    (draft.isNew || !project?.available) && jsxs('div', { className: 'hgl-field', children: [
      jsx('label', { htmlFor: 'hgl-description', children: t('description') }),
      jsx(Input, { id: 'hgl-description', value: draft.description, maxLength: 1000, disabled: busy, placeholder: t('optional'),
        onChange: event => setDraft(value => ({ ...value, description: event.target.value })) })
    ] }),
    jsx('p', { className: 'hgl-subtle', children: t('autoHint') }),
    jsx(RepositoryPicker, { ctx, scope, projects, draft, setDraft, busy }),
    error && jsxs('div', { role: 'alert', className: 'hgl-stack', children: [
      jsx('p', { className: 'hgl-error', children: `${t('saveError')}: ${error}` }),
      jsx('p', { className: 'hgl-subtle', children: t('reloadHint') }),
      jsx('div', { className: 'hgl-actions', children: jsx(Button, { type: 'button', variant: 'outline', disabled: busy || result.isFetching,
        onClick: reloadDraft, children: t('reload') }) })
    ] }),
    jsxs('div', { className: 'hgl-footer', children: [jsx('p', { className: 'hgl-subtle', children: t('preserve') }),
      jsxs('div', { className: 'hgl-actions', children: [
        jsx(Button, { type: 'button', variant: 'ghost', disabled: busy, onClick: () => { setDraft(null); setError(null) }, children: t('cancel') }),
        jsx(Button, { type: 'submit', loading: busy, disabled: !name || Boolean(nameError) || !data.connection_configured || !data.multiplex_enabled, children: t('save') })
      ] })]
    })
  ] })
  const deleter = deleting && jsxs('form', { className: 'hgl-form', onSubmit: remove, children: [
    jsx('h2', { children: t('deleteProject') }),
    jsx('p', { id: 'hgl-delete-hint', children: t('deleteHint', deleting.profile) }),
    jsxs('div', { className: 'hgl-field', children: [
      jsx('label', { htmlFor: 'hgl-delete-confirmation', children: t('profile') }),
      jsx(Input, { id: 'hgl-delete-confirmation', value: deleting.confirmation, autoFocus: true, autoComplete: 'off',
        disabled: busy, 'aria-describedby': 'hgl-delete-hint',
        onChange: event => setDeleting(value => ({ ...value, confirmation: event.target.value })) })
    ] }),
    error && jsx('p', { role: 'alert', className: 'hgl-error', children: error }),
    jsxs('div', { className: 'hgl-actions', children: [
      jsx(Button, { type: 'button', variant: 'ghost', disabled: busy, onClick: () => { setDeleting(null); setError(null) }, children: t('cancel') }),
      jsx(Button, { type: 'submit', variant: 'destructive', loading: busy,
        disabled: busy || !deleting.revision || deleting.confirmation !== deleting.profile, children: t('deleteProject') })
    ] })
  ] })
  const projectDrawer = inspectProject && jsxs('aside', { className: 'hgl-drawer', children: [
    jsxs('div', { className: 'hgl-drawer-head', children: [
      jsxs('div', { className: 'hgl-stack', children: [
        jsxs('div', { className: 'hgl-actions', children: [glyph(inspectProject.profile), jsx('h2', { children: inspectProject.profile })] }),
        (!inspectProject.available || !inspectProject.repositories.length) && jsx('p', { className: 'hgl-subtle', children: projectStatus(inspectProject, t) })
      ] }),
      jsx(Button, { type: 'button', variant: 'ghost', size: 'icon-xs', className: 'hgl-drawer-close', 'aria-label': t('closeDetail'), onClick: () => setInspect(null), children: jsx(Codicon, { name: 'close', size: '.875rem' }) })
    ] }),
    inspectProject.description ? jsx('p', { className: 'hgl-subtle', children: inspectProject.description }) : null,
    !inspectProject.available && jsx('p', { className: 'hgl-subtle', children: t('missingHint') }),
    jsx('h3', { children: t('repositories') }),
    inspectProject.repositories.length ? jsx('ul', { className: 'hgl-list', children: inspectProject.repositories.map(repo => jsx(Repository, { ctx, repo }, repo.id)) }) :
      jsx(EmptyState, { title: t('noRepositories'), description: t('noRepositoriesHint') }),
    jsx('h3', { children: t('recentActivity') }),
    eventRows.length ? jsxs('div', { className: 'hgl-stack', children: [
      jsx('div', { className: 'hgl-recent', children: eventRows.slice(0, 3).map(event => jsxs('button', { type: 'button', onClick: () => {
        setPane('activity'); setProjectScope(event.profile || 'all'); setInspect({ type: 'event', event })
      }, children: [
        jsx('span', { children: `${eventKind(event, t)} ${cardRef(event)}` }),
        pill(event.status, t(event.status)),
        jsx('span', { className: 'hgl-subtle', children: age(event.created_at, t) })
      ] }, event.id)) }),
      jsx(Button, { type: 'button', variant: 'ghost', onClick: () => {
        setPane('activity'); setProjectScope(inspectProject.profile); setInspect(null)
      }, children: t('allActivity') })
    ] }) : jsx('p', { className: 'hgl-subtle', children: t('noEventsHint') }),
    jsxs('div', { className: 'hgl-drawer-actions', children: [
      jsx(Button, { type: 'button', variant: 'outline', disabled: locked || !data.connection_configured || !data.multiplex_enabled,
        onClick: () => start(inspectProject), children: t('edit') }),
      jsx(Button, { type: 'button', variant: 'outline', disabled: locked || RESERVED.includes(inspectProject.profile), onClick: () => {
        setDeleting({ profile: inspectProject.profile, revision: data.revision, confirmation: '' }); setError(null); setSaved(null)
      }, children: t('deleteProject') })
    ] })
  ] })
  const eventDrawer = inspectEvent && jsxs('aside', { className: 'hgl-drawer', children: [
    jsxs('div', { className: 'hgl-drawer-head', children: [
      jsxs('div', { className: 'hgl-stack', children: [
        jsx('p', { className: 'hgl-subtle', children: `${eventKind(inspectEvent, t)} · ${inspectEvent.repository?.name || ''} ${cardRef(inspectEvent)}` }),
        jsx('h2', { children: inspectEvent.title || eventKind(inspectEvent, t) })
      ] }),
      jsx(Button, { type: 'button', variant: 'ghost', size: 'icon-xs', className: 'hgl-drawer-close', 'aria-label': t('closeDetail'), onClick: () => setInspect(null), children: jsx(Codicon, { name: 'close', size: '.875rem' }) })
    ] }),
    jsxs('div', { className: 'hgl-actions', children: [
      pill(inspectEvent.status, t(inspectEvent.status)),
      inspectEvent.created_at && jsx('span', { className: 'hgl-pill', children: age(inspectEvent.created_at, t) }),
      inspectEvent.command && jsx('span', { className: 'hgl-pill', children: inspectEvent.command })
    ] }),
    inspectEvent.author && jsx('p', { children: `@${inspectEvent.author}` }),
    jsx('h3', { children: t('request') }),
    jsx('div', { className: 'hgl-pre', children: inspectEvent.body || '—' }),
    inspectEvent.last_error && jsx('p', { className: 'hgl-error', children: inspectEvent.last_error }),
    jsx('h3', { children: t('dispatch') }),
    jsxs('dl', { className: 'hgl-dl', children: [
      jsx('dt', { children: t('profile') }), jsxs('dd', { children: [glyph(inspectEvent.profile || '?'), ' ', inspectEvent.profile || '—'] }),
      jsx('dt', { children: t('gitlabTodo') }), jsx('dd', { children: `#${inspectEvent.id}` }),
      jsx('dt', { children: t('card') }), jsx('dd', { children: inspectEvent.card || '—' }),
      jsx('dt', { children: t('session') }), jsxs('dd', { children: [inspectEvent.conversation || '—', inspectEvent.conversation && inspectEvent.card && inspectEvent.conversation !== inspectEvent.card ? ` · ${t('relatedIssue')}` : ''] }),
      jsx('dt', { children: t('discussion') }), jsx('dd', { children: inspectEvent.discussion || t('noDiscussion') }),
      jsx('dt', { children: t('attempts') }), jsx('dd', { children: String(inspectEvent.attempts || 0) }),
      jsx('dt', { children: t('polled') }), jsx('dd', { children: inspectEvent.created_at || '—' })
    ] }),
    jsxs('div', { className: 'hgl-drawer-actions', children: [
      inspectEvent.repository?.url && jsx(Button, { type: 'button', variant: 'outline', onClick: async () => {
        try { if (!await ctx.os.openExternal(inspectEvent.repository.url)) host.notify({ kind: 'error', message: t('openFailed') }) }
        catch { host.notify({ kind: 'error', message: t('openFailed') }) }
      }, children: t('openRepo', inspectEvent.repository.name) })
    ] })
  ] })
  const mappingTable = jsxs('div', { className: `hgl-split${inspectProject || deleting ? ' draw' : ''}`, children: [
    jsx('div', { className: 'hgl-table-wrap', children: visible.length ? jsxs('table', { className: 'hgl-table', children: [
      jsxs('thead', { children: [jsxs('tr', { children: [jsx('th', { children: t('projects') }), jsx('th', { children: t('repositories') }), jsx('th', { children: t('lastEvent') })] })] }),
      jsx('tbody', { children: visible.map(row => {
        const status = projectStatus(row, t)
        return jsxs('tr', { className: 'hgl-row', tabIndex: 0, role: 'button', 'aria-label': `${row.profile} ${status}`,
          'aria-current': inspectProject?.profile === row.profile, onClick: () => { if (!locked) { setSelected(row.profile); setInspect({ type: 'project', profile: row.profile }) } },
          onKeyDown: event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (!locked) { setSelected(row.profile); setInspect({ type: 'project', profile: row.profile }) } } },
          children: [
            jsxs('td', { children: [jsxs('div', { className: 'hgl-actions', children: [glyph(row.profile), jsx('strong', { children: row.profile }),
              status !== t('count', row.repositories.length) && jsx('span', { className: `hgl-pill${row.available ? '' : ' hgl-pill-bad'}`, children: status }) ] })] }),
            jsx('td', { className: 'hgl-muted', children: row.repositories.length ? t('count', row.repositories.length) : t('unregistered') }),
            jsx('td', { children: lastCell(row) })
          ] }, row.profile)
      }) })
    ] }) : jsx(EmptyState, { title: t('noProjects'), description: t('noProjectsHint') }) }),
    deleting ? jsx('aside', { className: 'hgl-drawer', children: deleter }) : inspectProject ? projectDrawer : null
  ] })
  const activityTable = jsxs('div', { className: `hgl-split${inspectEvent ? ' draw' : ''}`, children: [
    jsx('div', { className: 'hgl-table-wrap', children: events.isError ? jsx(ErrorState, { className: 'hgl-center', title: t('loadEventsError'), description: errorText(events.error),
      children: jsx(Button, { type: 'button', onClick: () => events.refetch(), children: t('retry') }) }) :
      events.isPending ? jsx('div', { className: 'hgl-center', role: 'status', 'aria-label': t('loading'), children: [0, 1, 2].map(n => jsx(Skeleton, { className: 'hgl-skeleton' }, n)) }) :
      eventRows.length ? jsxs('table', { className: 'hgl-table', children: [
        jsxs('thead', { children: [jsxs('tr', { children: [jsx('th', { children: t('when') }), jsx('th', { children: t('event') }), jsx('th', { children: t('projects') }), jsx('th', { children: t('status') })] })] }),
        jsx('tbody', { children: eventRows.map(event => jsxs('tr', { className: 'hgl-row', tabIndex: 0, role: 'button',
          'aria-label': `${eventKind(event, t)} ${cardRef(event)} ${event.profile || ''} ${t(event.status)}`,
          'aria-current': inspectEvent?.id === event.id,
          onClick: () => setInspect({ type: 'event', event }),
          onKeyDown: key => { if (key.key === 'Enter' || key.key === ' ') { key.preventDefault(); setInspect({ type: 'event', event }) } },
          children: [
            jsx('td', { className: 'hgl-muted', children: age(event.created_at, t) }),
            jsxs('td', { children: [jsx('div', { children: `${eventKind(event, t)} ${cardRef(event)}` }), jsx('div', { className: 'hgl-subtle', children: event.title })] }),
            jsxs('td', { children: [jsxs('div', { className: 'hgl-actions', children: [glyph(event.profile || '?'), event.profile || '—'] })] }),
            jsx('td', { children: pill(event.status, t(event.status)) })
          ] }, event.id)) })
      ] }) : jsx(EmptyState, { title: t('noEvents'), description: t('noEventsHint') }) }),
    inspectEvent ? eventDrawer : null
  ] })
  const mappingToolbar = jsxs('div', { className: 'hgl-toolbar', children: [
    jsx(Input, { className: 'hgl-search', value: mapQuery, placeholder: t('filterProjects'), 'aria-label': t('filterProjects'),
      onChange: event => setMapQuery(event.target.value.slice(0, 200)) }),
    jsxs(Select, { value: mapFilter, onValueChange: setMapFilter, children: [
      jsx(SelectTrigger, { className: 'hgl-select', 'aria-label': t('all'), children: jsx(SelectValue, {}) }),
      jsxs(SelectContent, { children: [
        jsx(SelectItem, { value: 'all', children: t('all') }),
        jsx(SelectItem, { value: 'empty', children: t('unmapped') }),
        jsx(SelectItem, { value: 'issue', children: t('needsAttention') })
      ] })
    ] }),
    jsxs('span', { className: 'hgl-primary', children: [
      jsx(Button, { type: 'button', variant: 'ghost', disabled: locked || result.isFetching, onClick: () => result.refetch(), children: t('refresh') }),
      jsx(Button, { type: 'button', disabled: locked || !data?.connection_configured || !data?.multiplex_enabled,
        onClick: () => start(null), children: t('newProject') })
    ] })
  ] })
  const activityToolbar = jsxs('div', { className: 'hgl-toolbar', children: [
    jsxs(Select, { value: projectScope, onValueChange: value => { setProjectScope(value); setEventPage(1) }, children: [
      jsx(SelectTrigger, { className: 'hgl-select', 'aria-label': t('allProjects'), children: jsx(SelectValue, {}) }),
      jsxs(SelectContent, { children: [
        jsx(SelectItem, { value: 'all', children: t('allProjects') }),
        ...projects.map(row => jsx(SelectItem, { value: row.profile, children: row.profile }, row.profile))
      ] })
    ] }),
    jsx(Input, { className: 'hgl-search', value: eventQuery, placeholder: t('filterEvents'), 'aria-label': t('filterEvents'),
      onChange: event => { setEventQuery(event.target.value.slice(0, 200)); setEventPage(1) } }),
    jsxs(Select, { value: eventStatus, onValueChange: value => { setEventStatus(value); setEventPage(1) }, children: [
      jsx(SelectTrigger, { className: 'hgl-select', 'aria-label': t('status'), children: jsx(SelectValue, {}) }),
      jsxs(SelectContent, { children: [
        jsx(SelectItem, { value: 'all', children: t('all') }),
        jsx(SelectItem, { value: 'open', children: t('openStatus') }),
        jsx(SelectItem, { value: 'retrying', children: t('retrying') }),
        jsx(SelectItem, { value: 'delivered', children: t('delivered') })
      ] })
    ] }),
    jsx(Button, { type: 'button', variant: 'ghost', disabled: locked || events.isFetching, onClick: () => events.refetch(), children: t('refresh') })
  ] })
  return jsxs('div', { className: 'hgl', children: [
    jsxs('header', { className: 'hgl-head', children: [
      jsx('h1', { children: t('title') }),
      jsxs('div', { className: 'hgl-tabs', role: 'tablist', children: [
        jsx('button', { type: 'button', className: 'hgl-tab', role: 'tab', 'aria-selected': pane === 'mappings', disabled: locked, onClick: () => switchPane('mappings'), children: t('mappings') }),
        jsxs('button', { type: 'button', className: 'hgl-tab', role: 'tab', 'aria-selected': pane === 'activity', disabled: locked, onClick: () => switchPane('activity'), children: [
          t('activity'), openCount ? jsx('span', { className: 'hgl-tab-count', children: t('openEvents', openCount) }) : null
        ] })
      ] })
    ] }),
    result.isPending ? jsx('div', { className: 'hgl-center', role: 'status', 'aria-label': t('loading'), children:
      [0, 1, 2].map(n => jsx(Skeleton, { className: 'hgl-skeleton' }, n)) }) : result.isError ? jsx(ErrorState, {
      className: 'hgl-center', title: t('loadError'), description: `${errorText(result.error)} ${t('backendHint')}`, children: jsxs('div', { className: 'hgl-actions', children: [
        jsx(Button, { type: 'button', onClick: () => result.refetch(), children: t('retry') }), messaging
      ] })
    }) : jsxs('div', { className: 'hgl-body', children: [
      !data.connection_configured && jsxs('section', { className: 'hgl-notice', children: [
        jsx('h2', { children: t('configureTitle') }), jsx('p', { className: 'hgl-subtle', children: t('configureHint') }),
        jsx('div', { className: 'hgl-actions', children: messaging })
      ] }),
      !data.multiplex_enabled && jsx('p', { className: 'hgl-notice', children: t('multiplex') }),
      saved && jsxs('section', { role: 'status', className: 'hgl-notice', children: [
        jsx('p', { className: 'hgl-status', children: saved.deleted ? t('deleted', saved.profile) : t('saved') }),
        !saved.deleted && (saved.model_setup?.model ? jsx('p', { children: t('modelReady', saved.model_setup.model, saved.model_setup.provider) }) :
          jsxs('div', { className: 'hgl-stack', children: [jsx('p', { children: t('setup') }), jsx('code', { children: `hermes -p ${saved.profile} setup` })] })),
        jsx('p', { className: 'hgl-subtle', children: saved.deleted ? t('restart') :
          t(({ running: 'restarting', finished: 'restartFinished', failed: 'restartFailed', unknown: 'restartUnknown' })[restartState]) }),
        jsxs('div', { className: 'hgl-actions', children: [
          !saved.deleted && ['failed', 'unknown'].includes(restartState) && jsx(Button, { type: 'button', variant: 'outline', loading: busy,
            disabled: busy, onClick: retryRestart, children: t('retryRestart') }), messaging
        ] })
      ] }),
      jsx('div', { className: 'hgl-panel', children: draft ? editor : jsxs('div', { className: 'hgl-panel', children: [
        pane === 'activity' ? activityToolbar : mappingToolbar,
        pane === 'activity' ? activityTable : mappingTable
      ] }) })
    ] })
  ] })
}

function ProjectsPage({ ctx }) {
  const connectionId = useValue(host.state.connectionId)
  const connectionProfile = useValue(host.state.profile)
  const scope = JSON.stringify([connectionId, connectionProfile])
  // A backend/profile change discards the old editor and all of its pending UI results.
  return jsx(ProjectsContent, { ctx, scope, connectionId, connectionProfile }, scope)
}

export default {
  id: ID, name: 'GitLab Projects', defaultEnabled: false,
  description: 'Register GitLab repositories to Hermes project profiles on the active backend.',
  register(ctx) {
    ctx.i18n.register(locales)
    const style = document.createElement('style')
    style.textContent = css
    document.head.append(style)
    ctx.onDispose(() => style.remove())
    ctx.register({ id: 'page', area: ROUTES_AREA, data: { path: '/gitlab-projects' }, render: () => jsx(ProjectsPage, { ctx }) })
    ctx.register({ id: 'nav', area: SIDEBAR_NAV_AREA, order: 51,
      data: { path: '/gitlab-projects', label: ctx.i18n.t('title'), codicon: 'repo' } })
  }
}
