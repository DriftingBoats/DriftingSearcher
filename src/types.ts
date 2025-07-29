export interface ChannelConfig {
  id: string
  name: string
  enable: boolean
}



export interface SearchResultItem {
  title: string
  link: string
  datetime?: string
  originalText?: string
}

export interface TelegramSearchResult {
  title: string
  datetime: string
  links: string[]
}

export interface GroupedResults {
  [key: string]: SearchResultItem[]
}