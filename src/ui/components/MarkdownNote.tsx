/**
 * Lightweight markdown renderer for Folio synthesis notes.
 *
 * Handles the fixed output format of the SYNTHESIZE_PROMPT:
 *   ## Heading
 *   Paragraph text
 *   - bullet item
 *   - bullet item
 *
 * No external dependency. Renders as React elements using folio.css classes.
 */

import type { ReactNode } from 'react'

interface MdProps {
  markdown: string
  className?: string
}

type Block =
  | { type: 'h2'; text: string }
  | { type: 'p'; text: string }
  | { type: 'ul'; items: string[] }

function parse(md: string): Block[] {
  const lines = md.split('\n')
  const blocks: Block[] = []
  let currentList: string[] | null = null

  const flushList = () => {
    if (currentList) {
      blocks.push({ type: 'ul', items: currentList })
      currentList = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()

    if (line.startsWith('## ')) {
      flushList()
      blocks.push({ type: 'h2', text: line.slice(3).trim() })
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!currentList) currentList = []
      currentList.push(line.slice(2).trim())
    } else if (line === '') {
      flushList()
    } else {
      flushList()
      if (line.trim()) blocks.push({ type: 'p', text: line.trim() })
    }
  }
  flushList()
  return blocks
}

/** Inline: bold (`**text**`) and italic (`*text*`) only. */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  // Match **bold**, *italic*, or plain text between them
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[0].startsWith('**')) {
      parts.push(<strong key={m.index}>{m[2]}</strong>)
    } else {
      parts.push(<em key={m.index}>{m[3]}</em>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

export function MarkdownNote({ markdown, className }: MdProps) {
  const blocks = parse(markdown)

  return (
    <div className={className}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h2':
            return (
              <p key={i} className="h-note-h">
                {renderInline(block.text)}
              </p>
            )
          case 'p':
            return (
              <p key={i} className="h-note-p">
                {renderInline(block.text)}
              </p>
            )
          case 'ul':
            return (
              <ul key={i} className="h-note-ul">
                {block.items.map((item, j) => (
                  <li key={j} className="h-note-q">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            )
        }
      })}
    </div>
  )
}
