// Regression: a runtime page registered after the compiled Desktop shell mounts must appear.
// Uses native routing, registry, subscription hooks, and the production React compiler.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'

const root = process.env.HERMES_AGENT_ROOT || join(homedir(), '.hermes/hermes-agent')
const native = join(root, 'apps/desktop/src')
const require = createRequire(join(root, 'package.json'))
const ts = require('typescript')
const babel = require('@babel/core')
const { build } = require('esbuild')
const { JSDOM } = require('jsdom')
const temp = await mkdtemp(join(tmpdir(), 'hermes-routes-'))
const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' })
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Node', 'MutationObserver']) globalThis[key] = dom.window[key]
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true })
globalThis.IS_REACT_ACT_ENVIRONMENT = true

try {
  const source = await readFile(join(native, 'app/contrib/surfaces.tsx'), 'utf8')
  const ast = ts.createSourceFile('surfaces.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const component = ast.statements.flatMap(s => s.declarationList?.declarations || [])
    .find(d => d.name.getText(ast) === 'ChatRoutesSurface')
  assert(component, 'Native route surface exists')
  const tileSource = await readFile(join(native, 'app/chat/route-tile.tsx'), 'utf8')
  const tileAst = ts.createSourceFile('tile.tsx', tileSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const tile = tileAst.statements.find(s => ts.isFunctionDeclaration(s) && s.name.text === 'RouteTilePane')
  assert(tile, 'Native split-pane route surface exists')
  await writeFile(join(temp, 'surface.tsx'), `
    import {memo,useMemo,Suspense} from 'react';
    import {useStore} from '@nanostores/react';
    import {atom} from 'nanostores';
    import {Routes,Route} from 'react-router';
    import {useContributions} from '${native}/contrib/react/use-contributions';
    import {contributedRoutes,ROUTES_AREA,NEW_CHAT_ROUTE} from '${native}/app/routes';
    const $activeConnectionId=atom('local'),$activeGatewayProfile=atom('default'),$gateway=atom(null),$gatewayState=atom('closed');
    const ChatView=()=> <p>Chat fallback</p>;
    const ModelMenuPanel=()=>null,ReasoningMenuPanel=()=>null,SkillsView=()=>null,MessagingView=()=>null,ArtifactsView=()=>null,LegacySessionRedirect=()=>null,Navigate=()=>null;
    const ContribBoundary=({children})=>children,ContribRender=({render:Page})=><Page/>;
    const latestChatActions=()=>({}),setStatusbarItemGroup=()=>{};
    const BUILTIN_PAGES={};
    export const ChatRoutesSurface=${component.initializer.getText(ast)};
    export ${tile.getText(tileAst)}
  `)
  await writeFile(join(temp, 'tree.ts'), 'export const noteActiveTreeGroup=()=>{},revealTreePane=()=>{};')
  await writeFile(join(temp, 'entry.jsx'), `
    import assert from 'node:assert/strict';
    import React from 'react';
    import {render,screen,act,cleanup} from '@testing-library/react';
    import {MemoryRouter} from 'react-router';
    import {registry} from '${native}/contrib/registry';
    import {ChatRoutesSurface,RouteTilePane} from './surface';
    const view=render(<MemoryRouter initialEntries={['/gitlab-projects']}><ChatRoutesSurface actions={{}}/></MemoryRouter>);
    assert(screen.getByText('Chat fallback'));
    let dispose;
    act(()=>{dispose=registry.register({id:'hermes-gitlab:page',source:'plugin:hermes-gitlab',area:'routes',data:{path:'/gitlab-projects'},render:()=> <h1>GitLab Projects</h1>})});
    assert(Boolean(screen.queryByRole('heading',{name:'GitLab Projects'})), 'Late plugin registration must replace the chat fallback with GitLab Projects');
    act(()=>dispose());
    assert(Boolean(screen.queryByText('Chat fallback')), 'Disabling the plugin removes its page');
    view.unmount(); cleanup();
    const split=render(<RouteTilePane path='/gitlab-projects'/>);
    assert(screen.getByText('no page at /gitlab-projects'));
    act(()=>{dispose=registry.register({id:'hermes-gitlab:page',area:'routes',data:{path:'/gitlab-projects'},render:()=> <h1>GitLab Projects</h1>})});
    assert(Boolean(screen.queryByRole('heading',{name:'GitLab Projects'})), 'Late plugin registration must also update a split pane');
    act(()=>dispose());
    assert(Boolean(screen.queryByText('no page at /gitlab-projects')), 'Disabling the plugin removes its split page');
    split.unmount(); cleanup();
    console.log('Native compiled route checks passed: late registration and removal update both the workspace and split panes.');
  `)
  await build({entryPoints:[join(temp,'entry.jsx')],outfile:join(temp,'check.cjs'),bundle:true,format:'cjs',platform:'node',jsx:'automatic',nodePaths:[join(root,'node_modules')],
    alias:{'@':native,'@/components/pane-shell/tree/store':join(temp,'tree.ts')},logLevel:'warning',plugins:[{
      name:'production-react-compiler',setup(b){b.onLoad({filter:/surface\.tsx$/},async args=>({
        contents:babel.transformSync(await readFile(args.path,'utf8'),{filename:args.path,configFile:false,babelrc:false,parserOpts:{plugins:['typescript','jsx']},plugins:[require('babel-plugin-react-compiler')]}).code,
        loader:'tsx',resolveDir:temp
      }))}
    }]})
  require(join(temp,'check.cjs'))
} catch(error) {
  console.error(error.message)
  process.exitCode=1
} finally {
  dom.window.close()
  await rm(temp,{recursive:true,force:true})
}
process.exit(process.exitCode||0)
