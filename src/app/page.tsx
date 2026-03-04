'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
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
  Heart
} from 'lucide-react'

interface Article {
  id: string
  title: string
  url: string
  source: string
  snippet: string
  publicationDate: string | null
  dateFound: string
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
  articlesFound: number
  weeklyArticles: Article[]
  message: string
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

// Reputable sources being monitored
const MONITORED_SOURCES = [
  { name: 'PubMed/PMC', url: 'pmc.ncbi.nlm.nih.gov', icon: '🔬' },
  { name: 'AABB', url: 'aabb.org', icon: '🏥' },
  { name: 'WHO', url: 'who.int', icon: '🌍' },
  { name: 'ASH Publications', url: 'ashpublications.org', icon: '📚' },
  { name: 'Science Direct', url: 'sciencedirect.com', icon: '📑' },
  { name: 'Springer', url: 'link.springer.com', icon: '📖' },
  { name: 'JMIR', url: 'jmir.org', icon: '💻' },
  { name: 'ResearchGate', url: 'researchgate.net', icon: '🎓' },
]

export default function Dashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [articles, setArticles] = useState<Article[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailPreview, setEmailPreview] = useState<string | null>(null)
  const [mailtoLink, setMailtoLink] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null)

  // Fetch system status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch('/api/status')
      const data = await response.json()
      if (data.success) {
        setStatus(data.data)
        if (data.data.weeklyArticles) {
          setArticles(data.data.weeklyArticles)
        }
      }
    } catch (error) {
      console.error('Error fetching status:', error)
    }
  }, [])

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await fetchStatus()
      // Load existing articles from status (articles already stored)
      setIsLoading(false)
    }
    loadData()
  }, [fetchStatus])

  // Trigger manual search
  const handleSearch = async () => {
    setIsSearching(true)
    setNotification(null)
    try {
      const response = await fetch('/api/search', { method: 'POST' })
      const data: SearchResult = await response.json()
      if (data.weeklyArticles) {
        setArticles(data.weeklyArticles)
      }
      await fetchStatus()
      setNotification({ type: 'success', message: data.message || 'Pesquisa concluída com sucesso!' })
    } catch (error) {
      setNotification({ type: 'error', message: 'Erro ao realizar pesquisa. Tente novamente.' })
    } finally {
      setIsSearching(false)
    }
  }

  // Send email report
  const handleSendEmail = async () => {
    setIsSendingEmail(true)
    setNotification(null)
    setMailtoLink(null)
    try {
      const response = await fetch('/api/send-email', { method: 'POST' })
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <Heart className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Monitor de Medicina Sem Sangue
              </h1>
              <p className="text-red-100 mt-1 text-sm sm:text-base">
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
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Last Search Card */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-500" />
                Última Pesquisa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-6 w-32" />
              ) : (
                <p className="text-lg font-semibold text-slate-900">
                  {formatDate(status?.lastSearch.lastSearchTimestamp || null)}
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
                Artigos Esta Semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-6 w-16" />
              ) : (
                <p className="text-3xl font-bold text-green-600">
                  {articles.length}
                </p>
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
                  {status?.lastSearch.sourcesSearched.length || MONITORED_SOURCES.length}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-8">
          <Button 
            onClick={handleSearch} 
            disabled={isSearching || isLoading}
            className="bg-red-600 hover:bg-red-700 text-white gap-2"
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
                Executar Pesquisa Agora
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleSendEmail} 
            disabled={isSendingEmail || isLoading || articles.length === 0}
            variant="outline"
            className="gap-2 border-red-200 hover:bg-red-50 hover:text-red-700"
            size="lg"
          >
            {isSendingEmail ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Preparando...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Enviar Relatório por Email
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Articles Section */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-red-500" />
                  Artigos Encontrados Esta Semana
                </CardTitle>
                <CardDescription>
                  Últimos artigos sobre medicina sem sangue de fontes médicas conceituadas
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
                                <h3 className="font-semibold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2">
                                  {article.title}
                                </h3>
                                <ExternalLink className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1 group-hover:text-red-500" />
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs bg-red-50 text-red-700 hover:bg-red-100">
                                  {article.source}
                                </Badge>
                                {article.publicationDate && (
                                  <span className="text-xs text-slate-500">
                                    {new Date(article.publicationDate).toLocaleDateString('pt-BR')}
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
            {/* Sources Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="w-5 h-5 text-red-500" />
                  Fontes Monitoradas
                </CardTitle>
                <CardDescription>
                  Revistas e bases de dados médicas conceituadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {MONITORED_SOURCES.map((source, index) => (
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

            {/* Email Config Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="w-5 h-5 text-red-500" />
                  Configuração de Email
                </CardTitle>
                <CardDescription>
                  Destinatário dos relatórios semanais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-sm text-slate-600 mb-1">Email configurado:</p>
                  <p className="font-mono font-semibold text-slate-900">
                    rui.cenoura@gmail.com
                  </p>
                </div>
                <div className="mt-4 text-sm text-slate-500">
                  <p>Relatórios são enviados automaticamente toda semana.</p>
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
                      className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
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
            <div className="flex items-center gap-2 text-slate-600">
              <Heart className="w-5 h-5 text-red-500" />
              <span className="text-sm">Monitor de Medicina Sem Sangue © {new Date().getFullYear()}</span>
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
