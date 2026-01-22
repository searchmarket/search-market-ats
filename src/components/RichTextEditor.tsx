'use client'

import dynamic from 'next/dynamic'
import { useMemo, useRef, useEffect } from 'react'
import 'react-quill/dist/quill.snow.css'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-40 bg-gray-50 rounded-lg animate-pulse" />
})

export default function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const lastValue = useRef(value || '')
  
  const modules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'indent': '-1'}, { 'indent': '+1' }],
      ['link'],
      ['clean']
    ],
  }), [])

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet', 'indent',
    'link'
  ]

  // Update ref when value prop changes from parent
  useEffect(() => {
    lastValue.current = value || ''
  }, [value])

  // Handle the change to prevent infinite loops
  const handleChange = (content: string) => {
    // Normalize empty content
    const normalizedContent = (content === '<p><br></p>' || content === '<p></p>') ? '' : content
    
    // Only call onChange if value actually changed
    if (normalizedContent !== lastValue.current) {
      lastValue.current = normalizedContent
      onChange(normalizedContent)
    }
  }

  return (
    <div className="rich-text-editor">
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
        className="bg-white rounded-lg"
      />
      <style jsx global>{`
        .rich-text-editor .ql-container {
          border-bottom-left-radius: 8px;
          border-bottom-right-radius: 8px;
          min-height: 150px;
          font-size: 14px;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          background: #f9fafb;
        }
        .rich-text-editor .ql-editor {
          min-height: 150px;
        }
        .rich-text-editor .ql-editor.ql-blank::before {
          color: #9ca3af;
          font-style: normal;
        }
      `}</style>
    </div>
  )
}
