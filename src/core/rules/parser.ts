import type { RuleDocument, RuleSection } from '../../shared/types'

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function buildSectionId(title: string, index: number) {
  const slug = slugify(title)
  return slug.length > 0 ? slug : `rule-${index + 1}`
}

export function parseRuleDocument(fileName: string, rawMarkdown: string): RuleDocument {
  const lines = rawMarkdown.split(/\r?\n/)
  const sections: RuleSection[] = []
  let currentSection: RuleSection | null = null

  const pushCurrentSection = () => {
    if (!currentSection) {
      return
    }

    currentSection.body = currentSection.body.trim()
    currentSection.bullets = currentSection.bullets.filter((bullet) => bullet.length > 0)
    sections.push(currentSection)
  }

  lines.forEach((line, index) => {
    const headingMatch = line.match(/^(#{1,6})\s+(.+?)\s*$/)

    if (headingMatch) {
      pushCurrentSection()

      currentSection = {
        id: buildSectionId(headingMatch[2], sections.length),
        title: headingMatch[2].trim(),
        level: headingMatch[1].length,
        body: '',
        bullets: [],
      }

      return
    }

    const bulletMatch = line.match(/^\s*[-*+]\s+(.+?)\s*$/)

    if (!currentSection) {
      currentSection = {
        id: `rule-${sections.length + 1}`,
        title: `Rule ${sections.length + 1}`,
        level: 1,
        body: '',
        bullets: [],
      }
    }

    if (bulletMatch) {
      currentSection.bullets.push(bulletMatch[1].trim())
      currentSection.body += `${bulletMatch[1].trim()}\n`
      return
    }

    if (line.trim().length === 0) {
      if (currentSection.body.length > 0 && !currentSection.body.endsWith('\n\n')) {
        currentSection.body += '\n'
      }
      return
    }

    currentSection.body += `${line.trim()}\n`

    if (index === lines.length - 1) {
      currentSection.body = currentSection.body.trim()
    }
  })

  pushCurrentSection()

  return {
    fileName,
    rawMarkdown,
    uploadedAt: Date.now(),
    sections,
  }
}
