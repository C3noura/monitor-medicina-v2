'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  Mail, 
  Calendar, 
  Clock, 
  ExternalLink, 
  RefreshCw, 
  FileText, 
  Globe,
  Activity,
  Database,
  Send,
  CheckCircle,
  AlertCircle,
  Heart,
  Plus,
  X,
  Users,
  Bell,
  Trash2
} from 'lucide-react'

interface Article {
  id: string
  title: string
  url: string
  source: string
  snippet: string
  publicationDate: string | null
  dateFound: string
  language?: string
  isPortuguese?: boolean
}

interface SystemStatus {
  lastSearch: {
    lastSearchTimestamp: string | null
    nextScheduledSearch: string | null
    articlesFound: number
    sourcesSearched: string[]
  }
  articlesCount: number
  emailRecipient: string
  weeklyArticles: Article[]
}

interface SearchResult {
  success: boolean
  data?: {
    articlesFound: number
    portugueseArticles?: number
    weeklyArticles: Article[]
    message: string
    dateRange?: string
    sources?: {
      portuguese: string[]
      international: string[]
    }
  }
  error?: string
}

interface EmailResult {
  success: boolean
  data?: {
    recipient: string
    subject: string
    articlesCount: number
    emailId?: string
    message: string
  }
  error?: string
  instructions?: string
  htmlPreview?: string
  mailtoLink?: string
}

// Portuguese medical sources (PRIORITY)
const PORTUGUESE_SOURCES = [
  { name: 'Acta Médica Portuguesa', url: 'actamedicaportuguesa.com', icon: '🇵🇹' },
  { name: 'SciELO Portugal', url: 'scielo.pt', icon: '🇵🇹' },
  { name: 'Revista Portuguesa Cardiologia', url: 'revportcardiologia.pt', icon: '🇵🇹' },
  { name: 'Revista Portuguesa MG&F', url: 'rpmgf.pt', icon: '🇵🇹' },
]

// International reputable sources being monitored
const INTERNATIONAL_SOURCES = [
  { name: 'PubMed/PMC', url: 'pmc.ncbi.nlm.nih.gov', icon: '🔬' },
  { name: 'WHO', url: 'who.int', icon: '🌍' },
  { name: 'Science Direct', url: 'sciencedirect.com', icon: '📑' },
  { name: 'Europe PMC', url: 'europepmc.org', icon: '🇪🇺' },
  { name: 'DOAJ', url: 'doaj.org', icon: '📖' },
  { name: 'OpenAlex', url: 'openalex.org', icon: '🎓' },
]

// All sources combined
const MONITORED_SOURCES = [...PORTUGUESE_SOURCES, ...INTERNATIONAL_SOURCES]

// Date range for articles (last 4 years)
const DATE_RANGE = '2021-2025'

// Local storage keys
const STORAGE_KEYS = {
  articles: 'bloodless_medicine_articles',
  lastSearch: 'bloodless_medicine_last_search',
  subscribers: 'bloodless_medicine_subscribers'
}

// Default admin email
const ADMIN_EMAIL = 'rui.cenoura@gmail.com'

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailPreview, setEmailPreview] = useState<string | null>(null)
  const [mailtoLink, setMailtoLink] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  
  // Email subscription states
  const [subscribers, setSubscribers] = useState<string[]>([ADMIN_EMAIL])
  const [newSubscriber, setNewSubscriber] = useState('')
  const [subscriberError, setSubscriberError] = useState<string | null>(null)
  
  // Individual email send state
  const [individualEmail, setIndividualEmail] = useState('')
  const [individualEmailError, setIndividualEmailError] = useState<string | null>(null)

  // Load subscribers from localStorage
  const loadSubscribers = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.subscribers)
      if (stored) {
        const parsed = JSON.parse(stored) as string[]
        // Ensure admin email is always included
        if (!parsed.includes(ADMIN_EMAIL)) {
          parsed.unshift(ADMIN_EMAIL)
        }
        return parsed
      }
    } catch (error) {
      console.error('Error loading subscribers:', error)
    }
    return [ADMIN_EMAIL]
  }, [])

  // Save subscribers to localStorage
  const saveSubscribers = useCallback((emails: string[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.subscribers, JSON.stringify(emails))
    } catch (error) {
      console.error('Error saving subscribers:', error)
    }
  }, [])

  // Validate email
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Add new subscriber
  const handleAddSubscriber = () => {
    setSubscriberError(null)
    
    if (!newSubscriber.trim()) {
      setSubscriberError('Por favor insira um email')
      return
    }
    
    if (!isValidEmail(newSubscriber)) {
      setSubscriberError('Por favor insira um email válido')
      return
    }
    
    if (subscribers.includes(newSubscriber.toLowerCase())) {
      setSubscriberError('Este email já está subscrito')
      return
    }
    
    const updatedSubscribers = [...subscribers, newSubscriber.toLowerCase()]
    setSubscribers(updatedSubscribers)
    saveSubscribers(updatedSubscribers)
    setNewSubscriber('')
    setNotification({ type: 'success', message: `Email ${newSubscriber} adicionado aos subscritores!` })
  }

  // Remove subscriber (except admin)
  const handleRemoveSubscriber = (email: string) => {
    if (email === ADMIN_EMAIL) {
      setNotification({ type: 'error', message: 'Não é possível remover o email principal' })
      return
    }
    
    const updatedSubscribers = subscribers.filter(s => s !== email)
    setSubscribers(updatedSubscribers)
    saveSubscribers(updatedSubscribers)
    setNotification({ type: 'success', message: `Email ${email} removido da lista` })
  }

  // Load articles from localStorage
  const loadFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.articles)
      if (stored) {
        const parsed = JSON.parse(stored)
        return parsed as Article[]
      }
    } catch (error) {
      console.error('Error loading from localStorage:', error)
    }
    return []
  }, [])

  // Save articles to localStorage
  const saveToStorage = useCallback((newArticles: Article[]) => {
    try {
      localStorage.setItem(STORAGE_KEYS.articles, JSON.stringify(newArticles))
      localStorage.setItem(STORAGE_KEYS.lastSearch, JSON.stringify({
        timestamp: new Date().toISOString(),
        count: newArticles.length
      }))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }, [])

  // Fetch system status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/status')
      const data = await response.json()
      if (data.success) {
        setStatus(data.data)
      }
    } catch (error) {
      console.error('Error fetching status:', error)
    }
  }, [])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      
      // Load from localStorage first
      const storedArticles = loadFromStorage()
      if (storedArticles.length > 0) {
        setArticles(storedArticles)
      }
      
      // Load subscribers
      const storedSubscribers = loadSubscribers()
      setSubscribers(storedSubscribers)
      
      await fetchStatus()
      setIsLoading(false)
    }
    loadData()
  }, [fetchStatus, loadFromStorage, loadSubscribers])

  // Trigger manual search
  const handleSearch = async () => {
    setIsSearching(true)
    setNotification(null)
    try {
      const response = await fetch('/api/search', { method: 'POST' })
      const data: SearchResult = await response.json()
      
      if (data.success && data.data) {
        const foundArticles = data.data.weeklyArticles || []
        
        // Merge with existing articles, avoiding duplicates
        const existingUrls = new Set(articles.map(a => a.url))
        const newArticles = foundArticles.filter(a => !existingUrls.has(a.url))
        const mergedArticles = [...newArticles, ...articles].slice(0, 100)
        
        setArticles(mergedArticles)
        saveToStorage(mergedArticles)
        
        setNotification({ 
          type: 'success', 
          message: `${data.data.message} ${newArticles.length} novos artigos encontrados.` 
        })
      } else {
        setNotification({ 
          type: 'error', 
          message: data.error || 'Erro ao realizar pesquisa' 
        })
      }
      
      await fetchStatus()
    } catch (error) {
      console.error('Search error:', error)
      setNotification({ type: 'error', message: 'Erro ao realizar pesquisa. Tente novamente.' })
    } finally {
      setIsSearching(false)
    }
  }

  // Send email to individual recipient (NOT to all subscribers)
  const handleSendEmail = async () => {
    setIndividualEmailError(null)
    
    // Validate individual email
    if (!individualEmail.trim()) {
      setIndividualEmailError('Por favor insira um email para enviar o relatório')
      return
    }
    
    if (!isValidEmail(individualEmail)) {
      setIndividualEmailError('Por favor insira um email válido')
      return
    }
    
    setIsSendingEmail(true)
    setNotification(null)
    setMailtoLink(null)
    try {
      // Send ONLY to the individual email provided
      const response = await fetch('/api/send-email', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          articles,
          recipient: individualEmail.toLowerCase(), // Single recipient
          mode: 'individual' // Mark as individual send
        })
      })
      const data: EmailResult = await response.json()
      
      if (data.success && data.data) {
        setEmailPreview(data.htmlPreview || '')
        setMailtoLink(data.mailtoLink || null)
        setNotification({ type: 'success', message: data.data.message })
      } else {
        setEmailPreview(data.htmlPreview || '')
        setMailtoLink(data.mailtoLink || null)
        setNotification({ 
          type: 'error', 
          message: data.error || 'Erro ao enviar email'
        })
      }
    } catch (error) {
      console.error('Email error:', error)
      setNotification({ type: 'error', message: 'Erro ao enviar email. Tente novamente.' })
    } finally {
      setIsSendingEmail(false)
    }
  }

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca'
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Calculate time until next search
  const getTimeUntilNextSearch = () => {
    if (!status?.lastSearch.nextScheduledSearch) return 'Em 7 dias'
    const next = new Date(status.lastSearch.nextScheduledSearch)
    const now = new Date()
    const diff = next.getTime() - now.getTime()
    
    if (diff <= 0) return 'Agora'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `Em ${days} dias e ${hours} horas`
    return `Em ${hours} horas`
  }

  // Get last search info from localStorage
  const getLastSearchInfo = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.lastSearch)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Error reading last search:', error)
    }
    return null
  }

  const lastSearchInfo = getLastSearchInfo()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50">
      {/* Header */}
      <header className="bg-gradient-to-r to-violet-700 to-violet-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white rounded-xl shadow-lg">
              <img 
                src="/logo-icon.png" 
                alt="Logo Monitor de Medicina Sem Sangue" 
                className="w-12 h-12 sm:w-14 sm:h-14 object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Monitor de Medicina Sem Sangue
              </h1>
              <p className="text-violet-100 mt-1 text-sm sm:text-base">
                Monitoramento automático de pesquisas médicas sobre tratamentos sem transfusão de sangue
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-4`}>
          <div className={`flex items-center gap-2 p-4 rounded-lg ${
            notification.type === 'success' 
              ? 'bg-green-50 text-green-800 border border-green-200' 
              : 'bg-violet-50 text-violet-800 border border-violet-200'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-violet-600" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Last Search Card */}
          <Card className="border-l-4 border-l-violet-600">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-500" />
                Última Pesquisa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                <p className="text-lg font-semibold text-slate-900">
                  {lastSearchInfo ? formatDate(lastSearchInfo.timestamp) : 'Nunca'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Next Search Card */}
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-500" />
                Próxima Pesquisa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                <p className="text-lg font-semibold text-slate-900">
                  {getTimeUntilNextSearch()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Articles Found Card */}
          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500" />
                Artigos Encontrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <div>
                  <p className="text-3xl font-bold text-green-600">
                    {articles.length}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {articles.filter(a => a.isPortuguese).length} em português
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sources Searched Card */}
          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Globe className="w-4 h-4 text-purple-500" />
                Fontes Pesquisadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <p className="text-3xl font-bold text-purple-600">
                  {new Set(articles.map(a => a.source)).size || MONITORED_SOURCES.length}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Section - Search and Individual Email */}
        <Card className="mb-8 border-violet-200 bg-gradient-to-r from-violet-50 to-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="w-5 h-5 text-violet-500" />
              Pesquisa e Envio Individual
            </CardTitle>
            <CardDescription>
              Execute uma pesquisa e envie o relatório para o seu email
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search Button */}
              <Button 
                onClick={handleSearch} 
                disabled={isSearching || isLoading}
                className="bg-violet-700 hover:bg-violet-800 text-white gap-2"
                size="lg"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Pesquisando...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Executar Pesquisa
                  </>
                )}
              </Button>
              
              {/* Divider */}
              <div className="hidden lg:flex items-center">
                <div className="w-px h-10 bg-violet-200"></div>
              </div>
              
              {/* Individual Email Send */}
              <div className="flex-1 flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    placeholder="Insira o seu email para receber o relatório..."
                    value={individualEmail}
                    onChange={(e) => {
                      setIndividualEmail(e.target.value)
                      setIndividualEmailError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isSendingEmail && articles.length > 0) {
                        handleSendEmail()
                      }
                    }}
                    className="w-full"
                  />
                  {individualEmailError && (
                    <p className="text-xs text-red-600 mt-1">{individualEmailError}</p>
                  )}
                </div>
                <Button 
                  onClick={handleSendEmail} 
                  disabled={isSendingEmail || isLoading || articles.length === 0}
                  variant="default"
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                  size="lg"
                >
                  {isSendingEmail ? (
                    <>
                      <RefreshCw className="w-5 h-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Enviar para este Email
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 mt-3">
              💡 O email será enviado APENAS para o endereço indicado acima, não para a lista de subscritores.
            </p>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Articles Section */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-violet-500" />
                  Artigos Encontrados ({articles.length})
                </CardTitle>
                <CardDescription>
                  Artigos de {DATE_RANGE} sobre medicina sem sangue • Prioridade: fontes portuguesas 🇵🇹
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="space-y-2">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : articles.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Nenhum artigo encontrado</p>
                    <p className="text-sm">Clique em &ldquo;Executar Pesquisa Agora&rdquo; para buscar novos artigos</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px] pr-4">
                    <div className="space-y-4">
                      {articles.map((article, index) => (
                        <div key={article.id}>
                          {index > 0 && <Separator className="my-4" />}
                          <div className="group">
                            <a 
                              href={article.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block hover:bg-slate-50 rounded-lg p-3 -mx-3 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <h3 className="font-semibold text-slate-900 group-hover:text-violet-600 transition-colors line-clamp-2">
                                  {article.title}
                                </h3>
                                <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1 group-hover:text-violet-500" />
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                {article.isPortuguese && (
                                  <Badge variant="default" className="text-xs bg-green-600 text-white hover:bg-green-700">
                                    🇵🇹 PT
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs bg-violet-50 text-violet-700 hover:bg-violet-100">
                                  {article.source}
                                </Badge>
                                {article.publicationDate && (
                                  <span className="text-xs text-slate-500">
                                    {article.publicationDate}
                                  </span>
                                )}
                              </div>
                              {article.snippet && (
                                <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                                  {article.snippet}
                                </p>
                              )}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Portuguese Sources Card */}
            <Card className="border-green-200 bg-green-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <span className="text-xl">🇵🇹</span>
                  Fontes Portuguesas (Prioridade)
                </CardTitle>
                <CardDescription>
                  Revistas médicas portuguesas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {PORTUGUESE_SOURCES.map((source) => (
                    <div 
                      key={source.url}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors"
                    >
                      <span className="text-lg">{source.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm">{source.name}</p>
                        <p className="text-xs text-slate-500 truncate">{source.url}</p>
                      </div>
                      <Badge variant="default" className="text-xs bg-green-600 text-white">
                        Prioridade
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* International Sources Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="w-5 h-5 text-violet-500" />
                  Fontes Internacionais
                </CardTitle>
                <CardDescription>
                  Bases de dados médicas mundiais ({DATE_RANGE})
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {INTERNATIONAL_SOURCES.map((source) => (
                    <div 
                      key={source.url}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-lg">{source.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm">{source.name}</p>
                        <p className="text-xs text-slate-500 truncate">{source.url}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Ativo
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Email Subscribers Card - For Automatic Weekly Reports */}
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                  👥 Subscritores (Envio Automático)
                </CardTitle>
                <CardDescription>
                  Recebem relatórios automaticamente todas as segundas-feiras
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Add new subscriber */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Adicionar subscritor:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@exemplo.com"
                      value={newSubscriber}
                      onChange={(e) => {
                        setNewSubscriber(e.target.value)
                        setSubscriberError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddSubscriber()
                        }
                      }}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleAddSubscriber}
                      size="icon"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {subscriberError && (
                    <p className="text-xs text-red-600">{subscriberError}</p>
                  )}
                </div>

                {/* List of subscribers */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span className="font-medium">Lista de subscritores:</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      {subscribers.length} {subscribers.length === 1 ? 'pessoa' : 'pessoas'}
                    </Badge>
                  </div>
                  <ScrollArea className="h-[120px] rounded-lg border bg-white p-2">
                    <div className="space-y-1">
                      {subscribers.map((email) => (
                        <div 
                          key={email}
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            email === ADMIN_EMAIL 
                              ? 'bg-blue-50 border border-blue-200' 
                              : 'bg-slate-50 hover:bg-slate-100'
                          } transition-colors`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="w-4 h-4 text-blue-500 flex-shrink-0" />
                            <span className="text-sm truncate font-medium text-slate-900">
                              {email}
                            </span>
                            {email === ADMIN_EMAIL && (
                              <Badge variant="outline" className="text-xs border-blue-300 text-blue-600">
                                Admin
                              </Badge>
                            )}
                          </div>
                          {email !== ADMIN_EMAIL && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50"
                              onClick={() => handleRemoveSubscriber(email)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <div className="text-xs text-slate-500 bg-slate-100 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span>Relatórios são enviados automaticamente toda semana para todos os subscritores.</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Email Preview */}
            {emailPreview && (
              <Card className={notification?.type === 'success' ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
                <CardHeader>
                  <CardTitle className={`flex items-center gap-2 text-lg ${notification?.type === 'success' ? 'text-green-800' : 'text-amber-800'}`}>
                    {notification?.type === 'success' ? (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Email Enviado com Sucesso!
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-5 h-5" />
                        Preview do Email
                      </>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white rounded-lg border p-3 max-h-64 overflow-hidden">
                    <div 
                      className="prose prose-sm max-w-none text-xs"
                      dangerouslySetInnerHTML={{ __html: emailPreview.substring(0, 2000) + (emailPreview.length > 2000 ? '...' : '') }}
                    />
                  </div>
                  <p className={`text-xs mt-2 ${notification?.type === 'success' ? 'text-green-700' : 'text-amber-700'}`}>
                    {notification?.type === 'success' 
                      ? '✅ Email entregue com sucesso para rui.cenoura@gmail.com'
                      : 'O email foi gerado. Use o botão abaixo para enviar.'
                    }
                  </p>
                  {mailtoLink && notification?.type !== 'success' && (
                    <a 
                      href={mailtoLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-violet-700 text-white rounded-lg hover:bg-violet-800 transition-colors text-sm font-medium"
                    >
                      <Mail className="w-4 h-4" />
                      Abrir no Meu Cliente de Email
                    </a>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-slate-50 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/logo-icon.png" 
                alt="Logo" 
                className="w-8 h-8 object-contain"
              />
              <span className="text-sm text-slate-600">Monitor de Medicina Sem Sangue © {new Date().getFullYear()}</span>
            </div>
            <div className="text-sm text-slate-500">
              Pesquisas realizadas em fontes médicas confiáveis
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
