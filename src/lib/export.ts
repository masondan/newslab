import type { Story, ContentBlock } from './types'

export function exportToTxt(story: Story): void {
  let content = `${story.title}\n`
  content += `By ${story.author_name}\n`
  content += `${'='.repeat(40)}\n\n`

  if (story.summary) {
    content += `${story.summary}\n\n`
  }

  if (story.content?.blocks) {
    story.content.blocks.forEach(block => {
      content += blockToText(block)
    })
  }

  downloadFile(content, `${slugify(story.title)}.txt`, 'text/plain')
}

export async function exportToPdf(story: Story): Promise<void> {
  const { jsPDF } = await import('jspdf')
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  const titleLines = doc.splitTextToSize(story.title, contentWidth)
  doc.text(titleLines, margin, y)
  y += titleLines.length * 10 + 5

  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`By ${story.author_name}`, margin, y)
  y += 10

  doc.setDrawColor(200)
  doc.line(margin, y, pageWidth - margin, y)
  y += 10

  doc.setTextColor(0)

  if (story.summary) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    const summaryLines = doc.splitTextToSize(story.summary, contentWidth)
    doc.text(summaryLines, margin, y)
    y += summaryLines.length * 6 + 8
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  if (story.content?.blocks) {
    for (const block of story.content.blocks) {
      if (y > 270) {
        doc.addPage()
        y = margin
      }

      const text = blockToText(block).trim()
      if (!text) continue

      if (block.type === 'heading') {
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
      } else if (block.type === 'bold') {
        doc.setFont('helvetica', 'bold')
      } else {
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
      }

      if (block.type === 'separator') {
        doc.setDrawColor(150)
        const centerX = pageWidth / 2
        doc.line(centerX - 30, y, centerX + 30, y)
        y += 8
      } else {
        const lines = doc.splitTextToSize(text, contentWidth)
        doc.text(lines, margin, y)
        y += lines.length * 6 + 4
      }
    }
  }

  doc.save(`${slugify(story.title)}.pdf`)
}

function blockToText(block: ContentBlock): string {
  switch (block.type) {
    case 'paragraph':
      return `${block.text}\n\n`
    case 'heading':
      return `\n## ${block.text}\n\n`
    case 'bold':
      return `**${block.text}**\n\n`
    case 'separator':
      return `\n---\n\n`
    case 'list':
      if (block.items) {
        return block.items.map((item, i) => 
          block.listType === 'ordered' ? `${i + 1}. ${item}` : `• ${item}`
        ).join('\n') + '\n\n'
      }
      return ''
    case 'image':
      return block.caption ? `[Image: ${block.caption}]\n\n` : '[Image]\n\n'
    case 'youtube':
      return `[YouTube: ${block.url}]\n\n`
    case 'link':
      return `${block.text} (${block.url})\n\n`
    default:
      return ''
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50)
}

function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
