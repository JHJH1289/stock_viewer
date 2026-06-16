import { useEffect, useState } from 'react'
import { searchStockMaster } from '../services/stockApi'

export function useStockSearch(keyword) {
  const [results, setResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')

  useEffect(() => {
    const searchId = window.setTimeout(async () => {
      const trimmedKeyword = keyword.trim()

      if (!trimmedKeyword) {
        setResults([])
        setSearchError('')
        setIsSearching(false)
        return
      }

      setIsSearching(true)
      try {
        setResults(await searchStockMaster(trimmedKeyword, 20))
        setSearchError('')
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : 'Unable to search stocks.')
      } finally {
        setIsSearching(false)
      }
    }, 250)

    return () => window.clearTimeout(searchId)
  }, [keyword])

  return {
    results,
    isSearching,
    searchError,
  }
}
