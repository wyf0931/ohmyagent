/**
 * Tests for Tools Registry
 */

import { describe, it, expect } from 'vitest'
import { getEnabledTools, getToolsStatus } from '../index'

describe('Tools Registry', () => {
  it('should export tools registry', () => {
    expect(getEnabledTools).toBeDefined()
    expect(getToolsStatus).toBeDefined()
  })

  it('should return enabled tools', () => {
    const tools = getEnabledTools()

    expect(tools).toBeInstanceOf(Array)
    expect(tools.length).toBeGreaterThan(0)
  })

  it('should include websearch tool', () => {
    const tools = getEnabledTools()

    const websearch = tools.find((t: any) => t.name === 'websearch')
    expect(websearch).toBeDefined()
    expect(websearch?.label).toBe('Web Search')
  })

  it('should include webfetch tool', () => {
    const tools = getEnabledTools()

    const webfetch = tools.find((t: any) => t.name === 'webfetch')
    expect(webfetch).toBeDefined()
    expect(webfetch?.label).toBe('Web Fetch')
  })

  it('should provide tool status', () => {
    const status = getToolsStatus()

    expect(status).toHaveProperty('websearch')
    expect(status).toHaveProperty('webfetch')
  })

  it('should provide websearch status details', () => {
    const status = getToolsStatus()

    expect(status.websearch).toHaveProperty('available')
    expect(status.websearch.available).toBeInstanceOf(Array)
  })

  it('should provide webfetch status details', () => {
    const status = getToolsStatus()

    expect(status.webfetch).toHaveProperty('available')
    expect(status.webfetch).toHaveProperty('message')
  })

  it('should ensure tools have required properties', () => {
    const tools = getEnabledTools()

    tools.forEach((tool: any) => {
      expect(tool.name).toBeDefined()
      expect(typeof tool.name).toBe('string')
      expect(tool.label).toBeDefined()
      expect(typeof tool.label).toBe('string')
      expect(tool.description).toBeDefined()
      expect(typeof tool.description).toBe('string')
      expect(tool.parameters).toBeDefined()
      expect(tool.execute).toBeDefined()
      expect(typeof tool.execute).toBe('function')
    })
  })
})
