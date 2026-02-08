import * as $rdf from 'rdflib'
import * as panes from 'solid-panes'
import { authn, solidLogicSingleton, authSession, store } from 'solid-logic'
import versionInfo from './versionInfo'
import './styles/mash.css'

const global: any = window

// Theme Management
const initializeTheme = () => {
  const savedTheme = localStorage.getItem('mashlib-theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const theme = savedTheme || (prefersDark ? 'dark' : 'light')
  
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

const setTheme = (theme: 'light' | 'dark') => {
  if (theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
  localStorage.setItem('mashlib-theme', theme)
}

const getTheme = (): 'light' | 'dark' => {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

// Initialize theme on load
initializeTheme()

global.$rdf = $rdf
global.panes = panes
global.SolidLogic = {
  authn,
  authSession, 
  store,
  solidLogicSingleton
}
global.mashlib = {
  versionInfo,
  theme: {
    set: setTheme,
    get: getTheme,
    init: initializeTheme
  }
}

// Data Island support
const DATA_ISLAND_TYPES = [
  'text/turtle',
  'text/n3',
  'application/ld+json',
  'application/rdf+xml'
]

function loadDataIslands (store: any, baseURI: string): Set<string> {
  const loadedBases = new Set<string>()
  for (const type of DATA_ISLAND_TYPES) {
    const scripts = document.querySelectorAll(`script[type="${type}"]`)
    scripts.forEach((script) => {
      const content = script.textContent
      if (content && content.trim()) {
        const base = script.getAttribute('data-base') || baseURI
        try {
          $rdf.parse(content, store, base, type)
          loadedBases.add(base)
          console.log(`mashlib-di: loaded data island (${type}) with base ${base}`)
        } catch (e) {
          console.error(`mashlib-di: failed to parse data island (${type}):`, e)
        }
      }
    })
  }

  // Patch the fetcher to skip URIs already loaded from data islands
  if (loadedBases.size > 0) {
    const fetcher = store.fetcher
    if (fetcher) {
      const originalLoad = fetcher.load.bind(fetcher)
      fetcher.load = function (uri: any, options?: any) {
        const uriStr = typeof uri === 'string' ? uri : (uri.value || uri.uri || String(uri))
        // Strip fragment
        const docURI = uriStr.split('#')[0]
        if (loadedBases.has(docURI)) {
          console.log(`mashlib-di: skipping fetch for ${docURI} (loaded from data island)`)
          return Promise.resolve(
            { ok: true, status: 200, statusText: 'loaded from data island', url: docURI }
          )
        }
        return originalLoad(uri, options)
      }
      // Also mark as requested for anything checking this directly
      loadedBases.forEach((base) => {
        fetcher.requested[base] = true
        fetcher.requested[$rdf.sym(base).uri] = true
      })
    }
  }

  return loadedBases
}

global.mashlib.loadDataIslands = loadDataIslands

global.panes.runDataBrowser = function (uri?:string|$rdf.NamedNode|null) {
  // Set up cross-site proxy
  const fetcher: any = $rdf.Fetcher
  fetcher.crossSiteProxyTemplate = window.origin + '/xss/?uri={uri}'

  // Add web monetization tag to page header
  try {
    const webMonetizationTag: HTMLElement = document.createElement('meta')
    webMonetizationTag.setAttribute('name', 'monetization')
    webMonetizationTag.setAttribute('content', `$${window.location.host}`)
    document.head.appendChild(webMonetizationTag)
  } catch (e) {
    console.error('Failed to add web monetization tag to page header')
  }

  // Load data islands before fetching remote data
  const baseURI = uri
    ? (typeof uri === 'string' ? uri : uri.value)
    : window.location.href
  const loadedBases = loadDataIslands(solidLogicSingleton.store, baseURI)
  if (loadedBases.size > 0) {
    console.log(`mashlib-di: ${loadedBases.size} data island(s) loaded into store`)
  }

  // Authenticate the user
  authn.checkUser().then(function (_profile: any) {
    const mainPage = panes.initMainPage(solidLogicSingleton.store, uri)
    return mainPage
  })
}

window.onpopstate = function (_event: any) {
  global.document.outline.GotoSubject(
    $rdf.sym(window.document.location.href),
    true,
    undefined,
    true,
    undefined
  )
}

// It's not clear where this function is used, so unfortunately we cannot remove it:
function dump (msg: string[]) {
  console.log(msg.slice(0, -1))
}

global.dump = dump

export {
  versionInfo
}
