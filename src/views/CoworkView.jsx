import React from 'react'
import { Layers, FileText, Code2, Globe, ArrowRight } from 'lucide-react'
import PlaceholderView from '../components/PlaceholderView.jsx'

const features = [
  { icon: <FileText size={18} />, title: 'Document editing', desc: 'Co-author reports, proposals, and docs with AI assistance' },
  { icon: <Code2 size={18} />, title: 'Code workspace', desc: 'Multi-file agentic coding sessions with context awareness' },
  { icon: <Globe size={18} />, title: 'Browser automation', desc: 'Let Claude navigate and interact with web pages for you' },
]

export default function CoworkView() {
  return (
    <PlaceholderView
      icon={<Layers size={32} />}
      title="Cowork"
      subtitle="A shared workspace for you and Claude to create together"
      features={features}
      accent="#7c6af7"
    />
  )
}
