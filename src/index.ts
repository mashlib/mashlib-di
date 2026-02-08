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
          // Mark as already fetched so rdflib doesn't try to fetch remotely
          const fetcher = (store as any).fetcher || solidLogicSingleton.store.fetcher
          if (fetcher) {
            fetcher.requested[base] = true
          }
          console.log(`mashlib-di: loaded data island (${type}) with base ${base}`)
        } catch (e) {
          console.error(`mashlib-di: failed to parse data island (${type}):`, e)
        }
      }
    })
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
