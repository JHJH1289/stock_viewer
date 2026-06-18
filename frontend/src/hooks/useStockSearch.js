import { useEffect, useState } from 'react'
import { fetchStockQuotes, searchStockMaster } from '../services/stockApi'

export function useStockSearch(keyword) {
  const [results, setResults] = useState([])
  const [quotes, setQuotes] = useState({})
  const [isSearching, setIsSearching] = useState(false)
  const [isLoadingQuotes, setIsLoadingQuotes] = useState(false)
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    let cancelled = false

    const searchId = window.setTimeout(async () => {
      const trimmedKeyword = keyword.trim()

      if (!trimmedKeyword) {
        setResults([])
        setQuotes({})
        setSearchError('')
        setIsSearching(false)
        setIsLoadingQuotes(false)
        return
      }

      setIsSearching(true)
      setIsLoadingQuotes(false)

      try {
        const masterResults = await searchStockMaster(trimmedKeyword, 10)
        if (cancelled) return

        setResults(masterResults)
        setQuotes({})
        setSearchError('')

        if (masterResults.length > 0) {
          setIsLoadingQuotes(true)
          const quoteResults = await fetchStockQuotes(masterResults)
          if (cancelled) return

          setQuotes(
            Object.fromEntries(
              quoteResults.map((quote) => [`${quote.currency === 'KRW' ? 'KR' : 'US'}-${quote.symbol}`, quote]),
            ),
          )
        }
      } catch (err) {
        if (cancelled) return
        setSearchError(err instanceof Error ? err.message : 'Unable to search stocks.')
      } finally {
        if (!cancelled) {
          setIsSearching(false)
          setIsLoadingQuotes(false)
        }
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(searchId)
    }
  }, [keyword])

  return {
    results,
    quotes,
    isSearching,
    isLoadingQuotes,
    searchError,
  }
}
