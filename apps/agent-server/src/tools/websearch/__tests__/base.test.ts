/**
 * Tests for BaseSearchProvider
 */

import { describe, it, expect, beforeEach } from 'vitest'

// Import the abstract base class to test its protected methods
import { BaseSearchProvider } from '../providers/base'
import type { SearchRequest, SearchResponse } from '../types'

// Create a concrete implementation for testing
class TestProvider extends BaseSearchProvider {
  name = 'test'

  isAvailable(): boolean {
    return true
  }

  async search(request: SearchRequest): Promise<SearchResponse> {
    this.validateRequest(request)
    return {
      query: request.query,
      results: [],
      total: 0,
      provider: this.name,
      hasMore: false,
      requestId: this.generateRequestId(),
    }
  }
}

describe('BaseSearchProvider', () => {
  let provider: TestProvider

  beforeEach(() => {
    provider = new TestProvider()
  })

  describe('validateRequest', () => {
    it('should accept valid requests', async () => {
      await expect(provider.search({ query: 'test query' })).resolves.toBeDefined()
    })

    it('should reject empty queries', async () => {
      await expect(provider.search({ query: '' }))
        .rejects.toThrow('Query cannot be empty')
    })

    it('should reject whitespace-only queries', async () => {
      await expect(provider.search({ query: '   ' }))
        .rejects.toThrow('Query cannot be empty')
    })

    it('should accept valid maxResults', async () => {
      await expect(provider.search({ query: 'test', maxResults: 10 }))
        .resolves.toBeDefined()
    })

    it('should reject maxResults less than 1', async () => {
      await expect(provider.search({ query: 'test', maxResults: 0 }))
        .rejects.toThrow('maxResults must be between 1 and 100')
    })

    it('should reject maxResults greater than 100', async () => {
      await expect(provider.search({ query: 'test', maxResults: 101 }))
        .rejects.toThrow('maxResults must be between 1 and 100')
    })
  })

  describe('createResultItem', () => {
    it('should create valid result items', () => {
      const item = provider.createResultItem({
        id: '123',
        title: 'Test Title',
        url: 'https://example.com',
        content: 'Test content',
      })

      expect(item).toEqual({
        id: '123',
        title: 'Test Title',
        url: 'https://example.com',
        content: 'Test content',
        metadata: {},
      })
    })

    it('should clean HTML from text', () => {
      const item = provider.createResultItem({
        id: '123',
        title: '<p>Test Title</p>',
        url: 'https://example.com',
        content: '<div>Test content</div>',
      })

      expect(item.title).toBe('Test Title')
      expect(item.content).toBe('Test content')
    })

    it('should normalize URLs', () => {
      const item = provider.createResultItem({
        id: '123',
        title: 'Test',
        url: 'https://example.com/path?query=value',
        content: 'Content',
      })

      expect(item.url).toBe('https://example.com/path?query=value')
    })

    it('should include optional fields', () => {
      const item = provider.createResultItem({
        id: '123',
        title: 'Test',
        url: 'https://example.com',
        content: 'Content',
        date: '2024-01-01',
        author: 'Test Author',
        score: 10,
        type: 'article',
      })

      expect(item.date).toBe('2024-01-01')
      expect(item.author).toBe('Test Author')
      expect(item.score).toBe(10)
      expect(item.type).toBe('article')
    })

    it('should include metadata', () => {
      const metadata = { wordcount: 500, category: 'tech' }
      const item = provider.createResultItem({
        id: '123',
        title: 'Test',
        url: 'https://example.com',
        content: 'Content',
        metadata,
      })

      expect(item.metadata).toEqual(metadata)
    })
  })

  describe('cleanText', () => {
    it('should remove HTML tags', () => {
      const result = provider.cleanText('<p>Hello</p><div>World</div>')
      expect(result).toBe('Hello World')
    })

    it('should normalize whitespace', () => {
      const result = provider.cleanText('Hello    World   Test')
      expect(result).toBe('Hello World Test')
    })

    it('should trim text', () => {
      const result = provider.cleanText('  Hello World  ')
      expect(result).toBe('Hello World')
    })

    it('should handle complex HTML', () => {
      const result = provider.cleanText('<a href="test">Link</a> and <span>Text</span>')
      expect(result).toBe('Link and Text')
    })
  })

  describe('normalizeUrl', () => {
    it('should normalize valid URLs', () => {
      const url = provider.normalizeUrl('https://example.com/path')
      expect(url).toBe('https://example.com/path')
    })

    it('should handle invalid URLs gracefully', () => {
      const url = provider.normalizeUrl('not-a-url')
      expect(url).toBe('not-a-url')
    })

    it('should handle URLs with fragments', () => {
      const url = provider.normalizeUrl('https://example.com/path#section')
      expect(url).toBe('https://example.com/path#section')
    })
  })

  describe('generateRequestId', () => {
    it('should generate unique request IDs', () => {
      const id1 = provider.generateRequestId()
      const id2 = provider.generateRequestId()

      expect(id1).not.toBe(id2)
    })

    it('should generate valid request ID format', () => {
      const id = provider.generateRequestId()
      expect(id).toMatch(/^\d+-[a-z0-9]+$/)
    })
  })

  describe('handleError', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error')
      expect(() => {
        provider.handleError(error, 'test context')
      }).toThrow('test test context: Test error')
    })

    it('should handle unknown errors', () => {
      expect(() => {
        provider.handleError('string error', 'test context')
      }).toThrow('test test context: Unknown error')
    })

    it('should handle null errors', () => {
      expect(() => {
        provider.handleError(null, 'test context')
      }).toThrow('test test context: Unknown error')
    })
  })
})
