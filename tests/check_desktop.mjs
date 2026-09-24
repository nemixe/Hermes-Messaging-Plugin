// Run: node tests/check_desktop.mjs. Uses Hermes' installed dependencies; installs nothing.
// Real React, Query and native controls; backend/host/i18n and tooltip hints are fixtures.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, writeFile, mkdtemp, rm, readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const hermesRoot = process.env.HERMES_AGENT_ROOT || join(homedir(), '.hermes/hermes-agent')
const native = join(hermesRoot, 'apps/desktop/src')
const require = createRequire(join(hermesRoot, 'package.json'))
const { build } = require('esbuild')
const ts = require('typescript')
const { JSDOM } = require('jsdom')
const sourcePath = fileURLToPath(new URL('../desktop/plugin.js', import.meta.url))
const source = await readFile(sourcePath, 'utf8')
const sdkSource = ts.createSourceFile('sdk.ts', await readFile(join(native, 'sdk/index.ts'), 'utf8'), ts.ScriptTarget.Latest, true)
const sdkExports = new Set()
for (const statement of sdkSource.statements) {
  if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
    for (const item of statement.exportClause.elements) if (!item.isTypeOnly) sdkExports.add(item.name.text)
  }
  if (statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)) {
    if (statement.name) sdkExports.add(statement.name.text)
    for (const declaration of statement.declarationList?.declarations || []) sdkExports.add(declaration.name.text)
  }
}
for (const statement of ts.createSourceFile('plugin.js', source, ts.ScriptTarget.Latest, true).statements) {
  if (!ts.isImportDeclaration(statement)) continue
  const specifier = statement.moduleSpecifier.text
  assert(['@hermes/plugin-sdk', 'react', 'react/jsx-runtime'].includes(specifier), `Unsupported runtime import: ${specifier}`)
  if (specifier === '@hermes/plugin-sdk') {
    for (const item of statement.importClause.namedBindings.elements) assert(sdkExports.has(item.name.text), `Missing native SDK export: ${item.name.text}`)
  }
}

const temp = await mkdtemp(join(tmpdir(), 'hermes-gitlab-ui-'))
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'MutationObserver', 'Event', 'CustomEvent', 'MouseEvent', 'HTMLInputElement', 'HTMLButtonElement', 'HTMLFormElement', 'HTMLDivElement', 'DocumentFragment', 'getComputedStyle']) {
  globalThis[key] = key === 'getComputedStyle' ? dom.window.getComputedStyle.bind(dom.window) : dom.window[key]
}
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }


try {
  const sdk = join(temp, 'sdk.jsx')
  await writeFile(sdk, `
    import { atom } from 'nanostores';
    import { useStore } from '@nanostores/react';
    export { useQuery, useQueryClient } from '@tanstack/react-query';
    export { Button } from '${native}/components/ui/button.tsx';
    export { Checkbox } from '${native}/components/ui/checkbox.tsx';
    export { Codicon } from '${native}/components/ui/codicon.tsx';
    export { Input } from '${native}/components/ui/input.tsx';
    export { SearchField } from '${native}/components/ui/search-field.tsx';
    export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '${native}/components/ui/select.tsx';
    export { Skeleton } from '${native}/components/ui/skeleton.tsx';
    export { EmptyState } from '${native}/components/ui/empty-state.tsx';
    export { ErrorState } from '${native}/components/ui/error-state.tsx';
    export const useValue = useStore;
    export const ROUTES_AREA = 'routes', SIDEBAR_NAV_AREA = 'sidebar.nav';
    export const locale = atom('en');
    export const host = {state:{connectionId:atom('mac-mini'),profile:atom('default')},navigate:()=>{},notify:()=>{},openSession:async()=>{}};
    export let bundles;
    export const setBundles = value => bundles = value;
    export const translate = (key, ...args) => {const value = bundles[locale.get()][key] ?? bundles.en[key];return typeof value === 'function' ? value(...args) : value};
    export const usePluginI18n = () => {useStore(locale);return translate};
  `)
  const i18n = join(temp, 'i18n.jsx')
  await writeFile(i18n, `export const useI18n = () => ({t:{ui:{search:{clear:'Clear search'}}}});`)
  const tooltip = join(temp, 'tooltip.jsx')
  await writeFile(tooltip, `export const Tip = ({children}) => children;`)
  const alias = { '@hermes/plugin-sdk': sdk, '@/i18n': i18n, '@/components/ui/tooltip': tooltip, '@': native }
  if (process.argv.includes('--preview')) {
    const preview = join(temp, 'preview.jsx')
    await writeFile(preview, `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
      import {setBundles,translate,locale,host} from './sdk.jsx';
      import plugin from ${JSON.stringify(sourcePath)};
      const repos=[{id:'1842',name:'northstar/customer-portal',url:'https://gitlab.example/northstar/customer-portal',enabled:true},{id:'1843',name:'northstar/billing-api',url:'https://gitlab.example/northstar/billing-api',enabled:true},{id:'2056',name:'studio/design-system',url:'https://gitlab.example/studio/design-system',enabled:true},{id:'3108',name:'northstar/mobile-app',url:'https://gitlab.example/northstar/mobile-app',enabled:true}];
      const sessions=[{id:'sess-101',last_activity_at:new Date(Date.now()-120000).toISOString(),profile:'northstar',repository:repos[0],title:'Fix invoice rounding',author:'alice',cost_usd:0.12,cost_status:null,input_tokens:18420,output_tokens:910,card:'1842:issues:12',conversation:'1842:issues:12',target_type:'Issue',iid:'12',model:'gpt-5.6-terra'},{id:'sess-102',last_activity_at:new Date(Date.now()-360000).toISOString(),profile:'northstar',repository:repos[1],title:'Export invoices',author:'mei',cost_usd:0,cost_status:'included',input_tokens:2200,output_tokens:180,card:'1843:issues:8',conversation:'1843:issues:8',target_type:'Issue',iid:'8',model:'gpt-5.6-terra'}];
      const data={projects:[{profile:'northstar',available:true,description:'Customer platform and billing. Shared product decisions, architecture, and delivery context.',repositories:repos.slice(0,2),cost_usd:0.12,cost_status:null,last_session:{id:'sess-101',title:'Fix invoice rounding',last_activity_at:sessions[0].last_activity_at,cost_usd:0.12,cost_status:null,card:'1842:issues:12',iid:'12',target_type:'Issue',repository:repos[0]}},{profile:'studio',available:true,description:'Design tools and shared interface standards.',repositories:[repos[2]],cost_usd:0,cost_status:null,last_session:null},{profile:'operations',available:true,description:'Internal operations and knowledge.',repositories:[],cost_usd:0,cost_status:null,last_session:null}],revision:'a'.repeat(64),url:'https://gitlab.example',connection_configured:true,multiplex_enabled:true,poll_interval:30,transport:'polling',session_count:2};
      if(new URLSearchParams(location.search).has('long')){repos.push(...Array.from({length:48},(_,i)=>({id:String(4000+i),name:'northstar/service-'+(i+1),url:'https://gitlab.example/northstar/service-'+(i+1),enabled:true})));data.projects[0].repositories=repos.slice(4,24)};
      host.deleteProfile=async profile=>{data.projects=data.projects.filter(p=>p.profile!==profile)};
      let page;
      plugin.register({register:c=>{if(c.area==='routes')page=c.render},onDispose:()=>{},i18n:{register:setBundles,t:translate},os:{openExternal:async()=>true},rest:async(path,options)=>{
        if(path==='/projects')return structuredClone(data);
        if(path.startsWith('/sessions'))return {sessions:structuredClone(sessions),next_page:null,session_count:2,cost_usd:0.12,cost_status:null};
        if(path.startsWith('/activity?'))return {days:[{date:new URL('http://fixture'+path).searchParams.get('year')+'-01-01',responses:2,cost_usd:0.12}]};
        if(path==='/gateway/restart')return {restart_started:true,restart_pid:321};
        if(path.startsWith('/gateway/restart/status'))return {status:'finished'};
        if(path.startsWith('/repositories')){const q=new URL('http://fixture'+path).searchParams.get('q')||'';return {repositories:repos.filter(r=>r.name.includes(q)),next_page:null}};
        if(options.method==='DELETE'){const profile=decodeURIComponent(path.split('/').pop()),row=data.projects.find(p=>p.profile===profile);if(options.body.confirmation!==profile||options.body.revision!==data.revision)throw Error('Reload the project before deleting');row.repositories=[];data.revision='c'.repeat(64);return {profile,profile_delete_required:true,restart_required:true}};
        const profile=decodeURIComponent(path.split('/').pop()),row=data.projects.find(p=>p.profile===profile),selected=options.body.repositories.map(id=>repos.find(r=>r.id===id));
        if(row)row.repositories=selected;else data.projects.push({profile,available:true,description:options.body.description,repositories:selected});data.revision='b'.repeat(64);return {profile,created:!row,model_setup:{model:'gpt-5.6-terra',provider:'openai-codex'},restart_started:true,restart_pid:321};
      }});
      const client=new QueryClient();createRoot(document.getElementById('root')).render(<QueryClientProvider client={client}>{page()}</QueryClientProvider>);
      window.fixture={locale,host,data};
    `)
    await build({entryPoints:[preview],outfile:join(temp,'preview.js'),bundle:true,format:'esm',platform:'browser',jsx:'automatic',nodePaths:[join(hermesRoot,'node_modules')],alias,logLevel:'warning'})
    const assets=join(hermesRoot,'apps/desktop/dist/assets')
    const styles=(await readdir(assets)).filter(file=>file.endsWith('.css'))
    // Match Hermes TreeGroup's flex zone, bounded body, and independently scrollable absolute pane.
    const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${styles.map(file=>`<link rel="stylesheet" href="/assets/${file}">`).join('')}<style>html,body{height:100%;margin:0}body{display:flex;flex-direction:column;font-family:system-ui;background:var(--ui-bg-editor);color:var(--ui-text-primary)}.fixture-zone{position:relative;display:flex;flex:1;min-height:0;min-width:0;flex-direction:column;overflow:hidden}.fixture-body{position:relative;flex:1;min-height:0;min-width:0;overflow:hidden}.fixture-pane{position:absolute;inset:0;overflow:auto}#root{display:contents}.fixture-label{height:28px;flex-shrink:0;padding:5px 16px;font-size:11px;border-bottom:1px solid var(--ui-stroke-secondary);color:var(--ui-text-secondary)}</style></head><body><div class="fixture-label">Sample data · native Hermes controls · GitLab Projects preview</div><div class="fixture-zone"><div class="fixture-body"><div class="fixture-pane"><div id="root"></div></div></div></div><script type="module" src="/preview.js"></script></body></html>`
    const server=createServer(async(request,response)=>{
      try{
        const path=new URL(request.url,'http://localhost').pathname
        const file=path==='/preview.js'?join(temp,'preview.js'):path.startsWith('/assets/')&&!path.includes('..')?join(assets,path.slice(8)):null
        response.setHeader('Content-Type',path.endsWith('.js')?'text/javascript':path.endsWith('.css')?'text/css':path.endsWith('.woff2')?'font/woff2':'text/html')
        response.end(file?await readFile(file):html)
      }catch{response.statusCode=404;response.end('Not found')}
    })
    const port=Number(process.env.HGL_PREVIEW_PORT || 4167)
    server.listen(port,'127.0.0.1',()=>console.log(`Sample-data Desktop preview: http://127.0.0.1:${port}`))
    await new Promise(resolve=>{process.once('SIGINT',()=>server.close(resolve));process.once('SIGTERM',()=>server.close(resolve))})
  } else {
  const entry = join(temp, 'entry.jsx')
  await writeFile(entry, `
    import assert from 'node:assert/strict';
    import React from 'react';
    import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
    import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
    import { host, locale, setBundles, translate, bundles } from './sdk.jsx';
    import plugin from ${JSON.stringify(sourcePath)};
    export default (async () => {
      const a = {id:'1',name:'acme/service',url:'https://gitlab.example/acme/service',enabled:true};
      const b = {id:'2',name:'acme/frontend',url:'https://gitlab.example/acme/frontend',enabled:true};
      const other = {id:'3',name:'other/private',url:'https://gitlab.example/other/private',enabled:true};
      const c = {id:'4',name:'acme/worker',url:'https://gitlab.example/acme/worker',enabled:true};
      const sessionList = [{id:'sess-101',last_activity_at:new Date(Date.now()-120000).toISOString(),profile:'acme',repository:a,title:'Fix login',author:'alice',cost_usd:0.12,cost_status:null,input_tokens:1000,output_tokens:200,card:'1:issues:3',conversation:'1:issues:3',target_type:'Issue',iid:'3',model:'gpt-5.6-terra'}];
      const original = {projects:[{profile:'acme',available:true,description:'Acme project',repositories:[a],cost_usd:0.12,cost_status:null,last_session:{id:'sess-101',title:'Fix login',last_activity_at:sessionList[0].last_activity_at,cost_usd:0.12,cost_status:null,card:'1:issues:3',iid:'3',target_type:'Issue',repository:a}},{profile:'other',available:true,description:'',repositories:[other],cost_usd:0,cost_status:null,last_session:null},{profile:'empty',available:true,description:'',repositories:[],cost_usd:0,cost_status:null,last_session:null}],revision:'a'.repeat(64),url:'https://gitlab.example',connection_configured:true,multiplex_enabled:true,poll_interval:30,max_workers:5,transport:'polling',open_count:2,session_count:1};
      let data = structuredClone(original), failSave = false, pendingSave, deleteError, pendingDelete, nativeDeleteError, restartFails = false, restartStatus = 'finished', missingModel = false;
      const calls = [], nativeDeletes = [], contributions = [], disposers = [], opened = [];
      host.openSession = async (id, options) => { opened.push({id, options}); };
      host.deleteProfile = async profile => {
        nativeDeletes.push({profile,scope:[host.state.connectionId.get(),host.state.profile.get()]});
        if(nativeDeleteError) throw new Error(nativeDeleteError);
        data.projects = data.projects.filter(row=>row.profile!==profile);
      };
      const ctx = {register: c => contributions.push(c), onDispose: fn => disposers.push(fn), i18n:{register:setBundles,t:translate},os:{openExternal:async()=>true},rest:async(path,options) => {
        calls.push({scope:[host.state.connectionId.get(),host.state.profile.get()],path,options});
        if (path === '/projects') return structuredClone(data);
        if (path.startsWith('/activity?')) {
          const params = new URL('http://fixture'+path).searchParams;
          return {days:[{date:params.get('year')+'-01-01',responses:2,cost_usd:0.12}]};
        }
        if (path.startsWith('/sessions')) {
          const q = new URL('http://fixture'+path).searchParams;
          let rows = sessionList.filter(session => data.projects.some(p=>p.profile===session.profile));
          if (q.get('profile')) rows = rows.filter(session => session.profile === q.get('profile'));
          if (q.get('q')) rows = rows.filter(session => JSON.stringify(session).includes(q.get('q')));
          return {sessions: structuredClone(rows), next_page:null, session_count: sessionList.length, cost_usd: rows.reduce((n,s)=>n+(s.cost_usd||0),0), cost_status:null};
        }
        if (path === '/gateway/restart') return {restart_started:true,restart_pid:321};
        if (path.startsWith('/gateway/restart/status')) return {status:restartStatus};
        if (path.startsWith('/repositories')) return new URL('http://fixture'+path).searchParams.get('page') === '2' ? {repositories:[c],next_page:null} : {repositories:[a,b,other],next_page:2};
        if (options?.method === 'DELETE') {
          if(deleteError) throw new Error(deleteError);
          const profile = decodeURIComponent(path.split('/').pop()), row = data.projects.find(row=>row.profile===profile);
          assert.equal(options.body.confirmation,profile); assert.equal(options.body.revision,data.revision);
          row.repositories = []; data.revision = 'd'.repeat(64);
          if(!row.available) data.projects = data.projects.filter(row=>row.profile!==profile);
          if(pendingDelete) return new Promise(resolve=>pendingDelete.resolve=resolve);
          return {profile,profile_delete_required:row.available,restart_required:true};
        }
        if (failSave) throw new Error('Configuration changed; refresh the project list before saving');
        if (pendingSave) return new Promise(resolve => pendingSave.resolve = resolve);
        const profile = decodeURIComponent(path.split('/').pop());
        const row = data.projects.find(row=>row.profile===profile);
        const repositories = options.body.repositories.map(id=>[a,b,c,other].find(repo=>repo.id===id));
        if (row) row.repositories = repositories;
        else data.projects.push({profile,available:true,description:options.body.description || '',repositories});
        data.revision = 'b'.repeat(64);
        return {profile,created:!row,model_setup:{model:missingModel?'':'gpt-5.6-terra',provider:'openai-codex'},restart_started:!restartFails,restart_pid:321};
      }};
      assert.equal(plugin.id,'hermes-gitlab'); assert.equal(plugin.defaultEnabled,false); plugin.register(ctx);
      assert.equal(contributions.find(c=>c.area==='sidebar.nav').order,51);
      assert.equal(contributions.find(c=>c.area==='routes').data.path,'/gitlab-projects');
      for (const language of ['ja','zh','zh-hant']) assert.deepEqual(Object.keys(bundles[language]).sort(),Object.keys(bundles.en).sort());
      const client = new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0},mutations:{retry:false}}});
      const mounted = render(<QueryClientProvider client={client}>{contributions.find(c=>c.area==='routes').render()}</QueryClientProvider>);
      const openProject = async name => fireEvent.click(await screen.findByRole('button',{name:new RegExp('^'+name+' ')}));
      await screen.findByText('Polling every 30s · 5 workers · 2 waiting');
      assert(screen.getByRole('tab',{name:'Projects'}));
      assert.equal(screen.queryByRole('region',{name:'ChatGPT subscription'}), null);
      assert.equal(calls.some(call => call.path === '/subscription'), false);
      assert.equal(screen.queryByRole('columnheader',{name:'Tokens'}), null);
      fireEvent.click(screen.getByRole('tab',{name:'Heatmap'}));
      const currentYear = new Date().getFullYear();
      await waitFor(()=>assert(calls.some(call=>{
        const url = new URL('http://fixture'+call.path);
        return url.pathname==='/activity' && url.searchParams.get('year')===String(currentYear) && !url.searchParams.has('month');
      })));
      const day = await waitFor(()=>{
        const found = document.querySelector('[data-date="'+currentYear+'-01-01"]');
        assert(found); return found;
      });
      assert.match(day.title, /2 responses/);
      assert(day.title.includes('$0.12'));
      assert(day.title.includes('≈0.52%'));
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
      if(tomorrow.getFullYear()===currentYear) {
        const date = currentYear+'-'+String(tomorrow.getMonth()+1).padStart(2,'0')+'-'+String(tomorrow.getDate()).padStart(2,'0');
        assert.equal(document.querySelector('[data-date="'+date+'"]'), null);
      }
      fireEvent.change(screen.getByRole('combobox',{name:'Year'}), {target:{value:String(currentYear-1)}});
      await waitFor(()=>assert(calls.some(call=>call.path.startsWith('/activity?year='+(currentYear-1)+'&'))));
      await waitFor(()=>assert(document.querySelector('[data-date="'+(currentYear-1)+'-12-31"]')));
      fireEvent.click(await screen.findByRole('tab',{name:/Sessions/}));
      await screen.findByText('Fix login');
      assert.equal(screen.queryByRole('columnheader',{name:'Tokens'}), null);
      assert.equal(screen.queryByText('1k in · 200 out'), null);
      assert(screen.getByRole('columnheader',{name:'Cost % · Pro 5x/week'}));
      assert(screen.getByRole('cell',{name:'≈0.52%'}));
      fireEvent.click(screen.getByRole('button',{name:/Fix login/}));
      await screen.findByText('@alice');
      assert(screen.getAllByText('1k in · 200 out').length >= 2);
      assert(screen.getAllByText('Related project').length >= 2);
      assert(screen.getByText('Pro 5x weekly price equivalent'));
      assert.equal(screen.getAllByText('≈0.52%').length, 2);
      assert(screen.getByText(/Price comparison only; not actual quota use/));
      assert(screen.getByRole('button',{name:'Open in GitLab'}));
      fireEvent.click(screen.getByRole('button',{name:'Open session'}));
      assert.deepEqual(opened, [{id:'sess-101', options:{profile:'acme'}}]);
      fireEvent.click(screen.getByRole('tab',{name:'Projects'}));
      assert.equal(screen.queryByRole('columnheader',{name:'Tokens'}), null);
      await openProject('acme');
      await screen.findByText('Total tokens');
      await screen.findByText('Acme project');
      fireEvent.click(screen.getByRole('button',{name:'Edit registration'}));
      assert.equal(Boolean(screen.queryByLabelText('Description')),false,'existing description is create-only');
      await screen.findByRole('checkbox',{name:'Select acme/frontend'});
      assert(screen.getByRole('checkbox',{name:'Select other/private'}).disabled,'another profile owns repository');
      fireEvent.click(screen.getByRole('checkbox',{name:'Select acme/frontend'}));
      fireEvent.click(screen.getByRole('button',{name:'Next'}));
      await screen.findByRole('checkbox',{name:'Select acme/worker'});
      assert(screen.getByRole('button',{name:'Remove acme/frontend'}),'selected repo remains visible on page 2');
      fireEvent.click(screen.getByRole('checkbox',{name:'Select acme/worker'}));
      fireEvent.change(screen.getByRole('textbox',{name:'Search GitLab repositories'}),{target:{value:'worker'}});
      await waitFor(()=>assert(calls.some(c=>c.path==='/repositories?q=worker&page=1')));
      assert(screen.getByRole('button',{name:'Remove acme/worker'}),'selected repo remains visible after searching');
      fireEvent.click(screen.getByRole('button',{name:'Save and activate'}));
      await screen.findByText('Registration saved.');
      await screen.findByText(/Restart command completed/);
      assert.equal(Boolean(screen.queryByText(/hermes -p .* setup/)),false,'configured models do not show manual setup');
      const saved = calls.find(c=>c.options?.method==='PUT');
      assert.deepEqual(saved.options.body,{repositories:['1','2','4'],revision:'a'.repeat(64)});
      assert.deepEqual(saved.scope,['mac-mini','default']);
      await waitFor(()=>assert(screen.getByText('3 repositories')));
      fireEvent.click(screen.getByRole('button',{name:'Edit registration'}));
      await screen.findByRole('checkbox',{name:'Select acme/frontend'});
      fireEvent.click(screen.getByRole('button',{name:'Remove acme/service'}));
      failSave = true;
      fireEvent.click(screen.getByRole('button',{name:'Save and activate'}));
      await screen.findByRole('alert');
      assert(screen.getByText(/Configuration changed/));
      data.projects[0].repositories = [a]; data.revision = 'c'.repeat(64);
      fireEvent.click(screen.getByRole('button',{name:'Reload registration'}));
      await waitFor(()=>assert.equal(Boolean(screen.queryByRole('alert')),false));
      assert(screen.getByRole('button',{name:'Remove acme/service'}));
      assert.equal(Boolean(screen.queryByRole('button',{name:'Remove acme/frontend'})),false,'reload replaces stale draft');
      fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
      fireEvent.click(screen.getByRole('button',{name:'New project'}));
      fireEvent.change(screen.getByLabelText('Hermes profile'),{target:{value:'project-egg'}});
      assert(screen.getByRole('button',{name:'Save and activate'}).disabled,'starter template cannot be registered as a project');
      fireEvent.change(screen.getByLabelText('Hermes profile'),{target:{value:'global-project'}});
      assert(screen.getByRole('button',{name:'Save and activate'}).disabled,'shared skills profile cannot be registered as a project');
      fireEvent.change(screen.getByLabelText('Hermes profile'),{target:{value:'new-project'}});
      fireEvent.change(screen.getByLabelText('Description'),{target:{value:'New shared knowledge'}});
      failSave=false;
      fireEvent.click(screen.getByRole('button',{name:'Save and activate'}));
      await screen.findByText(/gpt-5.6-terra.*openai-codex/);
      assert.equal(Boolean(screen.queryByText('hermes -p new-project setup')),false,'new profiles inherit the model automatically');
      await waitFor(()=>assert(screen.getByRole('button',{name:/new-project/})));
      assert(data.projects.some(p=>p.profile==='new-project' && !p.repositories.length),'native profile can be unregistered');
      fireEvent.click(screen.getByRole('button',{name:'Edit registration'}));
      restartFails = true; missingModel = true;
      fireEvent.click(screen.getByRole('button',{name:'Save and activate'}));
      await screen.findByRole('button',{name:'Retry gateway restart'});
      assert(screen.getByText('hermes -p new-project setup'),'missing model needs setup, not a false success');
      assert.equal(Boolean(screen.queryByRole('button',{name:'Save and activate'})),false,'restart failure does not reopen the saved draft');
      const savesBeforeRetry = calls.filter(c=>c.options?.method==='PUT').length;
      const checksBeforeRetry = calls.filter(c=>c.path.startsWith('/gateway/restart/status')).length;
      restartStatus = 'failed';
      fireEvent.click(screen.getByRole('button',{name:'Retry gateway restart'}));
      await waitFor(()=>{
        assert(calls.filter(c=>c.path.startsWith('/gateway/restart/status')).length>checksBeforeRetry);
        assert(screen.getByText(/Gateway restart failed/));
        assert.equal(screen.getByRole('button',{name:'Retry gateway restart'}).disabled,false);
      });
      assert.equal(calls.filter(c=>c.options?.method==='PUT').length,savesBeforeRetry,'retry only restarts; never recreates or resaves a project');
      restartStatus = 'finished';
      fireEvent.click(screen.getByRole('button',{name:'Retry gateway restart'}));
      await screen.findByText(/Restart command completed/);
      restartFails = false; missingModel = false;
      fireEvent.click(screen.getByRole('button',{name:'Delete project'}));
      assert(screen.getByText(/permanently deletes.*memories.*sessions.*credentials.*skills/));
      assert(screen.getByText(/GitLab repositories.*kept/));
      assert(screen.getByRole('button',{name:'Delete project'}).disabled,'typed confirmation is required');
      fireEvent.change(screen.getByLabelText('Hermes profile'),{target:{value:'NEW-PROJECT'}});
      assert(screen.getByRole('button',{name:'Delete project'}).disabled,'confirmation must exactly match');
      fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
      assert.equal(calls.filter(c=>c.options?.method==='DELETE').length,0,'cancel never deletes');
      fireEvent.click(screen.getByRole('button',{name:'Delete project'}));
      fireEvent.change(screen.getByLabelText('Hermes profile'),{target:{value:'new-project'}});
      fireEvent.click(screen.getByRole('button',{name:'Delete project'}));
      await screen.findByText('Project new-project deleted. Restart required.');
      await waitFor(()=>assert.equal(Boolean(screen.queryByRole('button',{name:/new-project/})),false));
      assert.deepEqual(nativeDeletes,[{profile:'new-project',scope:['mac-mini','default']}]);
      assert.deepEqual(calls.find(c=>c.options?.method==='DELETE').options.body,{revision:'b'.repeat(64),confirmation:'new-project'});
      await openProject('acme');
      for(const message of ['Configuration changed; reload before deleting','Profile is used by another route']) {
        fireEvent.click(screen.getByRole('button',{name:'Delete project'}));
        fireEvent.change(screen.getByLabelText('Hermes profile'),{target:{value:'acme'}});
        deleteError = message; data.revision = 'e'.repeat(64);
        fireEvent.click(screen.getByRole('button',{name:'Delete project'}));
        await screen.findByRole('alert');
        assert(screen.getByText(new RegExp(message)));
        await waitFor(()=>assert.equal(screen.getByLabelText('Hermes profile').value,''));
        assert.equal(nativeDeletes.length,1,'rejected registration cleanup cannot delete profile');
        fireEvent.click(screen.getByRole('button',{name:'Cancel'}));
      }
      deleteError = null;
      fireEvent.click(screen.getByRole('button',{name:'Delete project'}));
      fireEvent.change(screen.getByLabelText('Hermes profile'),{target:{value:'acme'}});
      nativeDeleteError = 'Profile backend could not stop';
      fireEvent.click(screen.getByRole('button',{name:'Delete project'}));
      await screen.findByRole('alert');
      assert(screen.getByText(/Registration removed.*profile acme was not deleted/));
      assert(screen.getByText(/Profile backend could not stop/));
      assert(screen.getByRole('button',{name:'acme Not registered'}));
      assert.equal(Boolean(screen.queryByText('Project acme deleted. Restart required.')),false);
      await waitFor(()=>assert.equal(screen.getByLabelText('Hermes profile').value,''));
      nativeDeleteError = null;
      fireEvent.change(screen.getByLabelText('Hermes profile'),{target:{value:'acme'}});
      fireEvent.click(screen.getByRole('button',{name:'Delete project'}));
      await screen.findByText('Project acme deleted. Restart required.');
      assert.equal(calls.filter(c=>c.options?.method==='DELETE').at(-1).options.body.revision,'d'.repeat(64),'partial failure refreshes revision for retry');
      assert.equal(Boolean(screen.queryByRole('button',{name:/acme/})),false);
      data.projects.push({profile:'missing',available:false,description:'',repositories:[a],last_session:null});
      fireEvent.click(screen.getByRole('button',{name:'Refresh'}));
      fireEvent.click(await screen.findByRole('button',{name:'missing Profile missing'}));
      fireEvent.click(screen.getByRole('button',{name:'Delete project'}));
      fireEvent.change(screen.getByLabelText('Hermes profile'),{target:{value:'missing'}});
      fireEvent.click(screen.getByRole('button',{name:'Delete project'}));
      await screen.findByText('Project missing deleted. Restart required.');
      assert.equal(nativeDeletes.length,3,'missing profile skips native deletion');
      await openProject('other');
      fireEvent.click(screen.getByRole('button',{name:'Edit registration'}));
      pendingSave = {};
      fireEvent.click(screen.getByRole('button',{name:'Save and activate'}));
      await waitFor(()=>assert(pendingSave.resolve));
      const oldKey = client.getQueryCache().getAll().find(q=>q.queryKey[2]==='projects').queryKey;
      data = {...structuredClone(original),projects:[{profile:'remote-project',available:true,description:'Remote backend',repositories:[],last_session:null}],session_count:0};
      await act(async()=>host.state.connectionId.set('another-backend'));
      await openProject('remote-project');
      await screen.findByText('Remote backend');
      const statusCalls = calls.filter(c=>c.path.startsWith('/gateway/restart')).length;
      await act(async()=>pendingSave.resolve({profile:'stale-project',created:true,model_setup:{model:'',provider:''},restart_started:true,restart_pid:123}));
      assert.equal(calls.filter(c=>c.path.startsWith('/gateway/restart')).length,statusCalls,'old save cannot start status requests on a new backend');
      assert.equal(Boolean(screen.queryByText('hermes -p stale-project setup')),false,'old save cannot alter new backend');
      assert.equal(Boolean(screen.queryByLabelText('Description')),false,'old editor is discarded');
      assert(client.getQueryCache().getAll().some(q=>q.queryKey[1] !== oldKey[1]),'queries are scoped to backend');
      pendingSave = null;
      for(const atom of [host.state.connectionId,host.state.profile]) {
        await openProject('remote-project');
        fireEvent.click(screen.getByRole('button',{name:'Delete project'}));
        fireEvent.change(screen.getByLabelText('Hermes profile'),{target:{value:'remote-project'}});
        pendingDelete = {};
        fireEvent.click(screen.getByRole('button',{name:'Delete project'}));
        await waitFor(()=>assert(pendingDelete.resolve));
        await act(async()=>atom.set(atom.get()+'-switched'));
        await screen.findByRole('button',{name:/remote-project/});
        await act(async()=>pendingDelete.resolve({profile:'remote-project',profile_delete_required:true,restart_required:true}));
        assert.equal(nativeDeletes.length,3,'backend/profile switch blocks ambient native deletion');
        assert.equal(Boolean(screen.queryByText('Project remote-project deleted. Restart required.')),false);
      }
      await act(async()=>host.state.profile.set('research'));
      await waitFor(()=>assert(calls.some(c=>c.path==='/projects' && c.scope[1]==='research')));
      await act(async()=>locale.set('ja'));
      assert(screen.getByRole('heading',{name:'GitLab プロジェクト'}));
      mounted.unmount(); cleanup(); client.clear(); disposers.forEach(fn=>fn());
      assert.equal(document.querySelectorAll('style').length,0,'style removed on plugin disposal');
      console.log('Desktop checks passed: native SDK exports, native React controls, 4 locales, selection, pagination, ownership, save, conflict reload, profile creation, typed deletion, native profile teardown, partial-failure retry, missing-profile cleanup, backend/profile switches, stale-write guards and disposal.');
    })();
  `)
  await build({ entryPoints: [entry], outfile: join(temp, 'check.cjs'), bundle: true, format: 'cjs', platform: 'node', jsx: 'automatic',
    nodePaths: [join(hermesRoot, 'node_modules')], alias, logLevel: 'warning' })
  await require(join(temp, 'check.cjs')).default
  }
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  dom.window.close()
  await rm(temp, { recursive: true, force: true })
}
// React's bundled scheduler keeps MessagePorts open in jsdom; all assertions are awaited above.
process.exit(process.exitCode || 0)
