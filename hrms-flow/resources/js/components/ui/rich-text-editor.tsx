import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import BulletList from '@tiptap/extension-bullet-list'
import OrderedList from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import Blockquote from '@tiptap/extension-blockquote'
import { Button } from './button'
import { Separator } from './separator'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  Code
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
  editable?: boolean
}

export interface RichTextEditorRef {
  getContent: () => string
  setContent: (content: string) => void
  focus: () => void
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  content = '',
  onChange,
  placeholder = 'Start typing...',
  className,
  editable = true
}, ref) => {
  const [showHtml, setShowHtml] = useState(false)
  const [htmlContent, setHtmlContent] = useState(content)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkError, setLinkError] = useState('')

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
      }),
      BulletList.configure({
        HTMLAttributes: {
          class: 'list-disc list-outside ml-4',
        },
      }),
      OrderedList.configure({
        HTMLAttributes: {
          class: 'list-decimal list-outside ml-4',
        },
      }),
      ListItem,
      Blockquote.configure({
        HTMLAttributes: {
          class: 'border-l-4 border-gray-300 pl-4 italic',
        },
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'bulletList', 'orderedList'],
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (!showHtml) {
        onChange?.(editor.getHTML())
      }
    },
  })

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content)
    }
  }, [content, editor]);

  useImperativeHandle(ref, () => ({
    getContent: () => editor?.getHTML() || '',
    setContent: (content: string) => editor?.commands.setContent(content),
    focus: () => editor?.commands.focus(),
  }))

  if (!editor) {
    return null
  }
  const { t } = useTranslation();

  const addLink = () => {
    setLinkUrl(editor.getAttributes('link').href || '')
    setLinkDialogOpen(true)
  }

  const confirmLink = () => {
    if (!linkUrl.trim()) {
      setLinkError(t('URL is required.'))
      return
    }
    try {
      new URL(linkUrl.trim())
    } catch {
      setLinkError(t('Please enter a valid URL (e.g. https://example.com).'))
      return
    }
    editor.chain().focus().setLink({ href: linkUrl.trim() }).run()
    setLinkDialogOpen(false)
    setLinkUrl('')
    setLinkError('')
  }

  const cancelLink = () => {
    setLinkDialogOpen(false)
    setLinkUrl('')
    setLinkError('')
  }

  const toggleHtmlView = () => {
    if (showHtml) {
      // Switch back to editor view
      editor?.commands.setContent(htmlContent, false)
      onChange?.(htmlContent)
      setShowHtml(false)
    } else {
      // Switch to HTML view - use original content if available
      const currentHtml = content || editor?.getHTML() || ''
      setHtmlContent(currentHtml)
      setShowHtml(true)
    }
  }

  const handleHtmlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newHtml = e.target.value
    setHtmlContent(newHtml)
    onChange?.(newHtml)
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      {editable && (
        <div className="border-b p-2 flex flex-wrap gap-1 bg-muted/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={editor.isActive('bold') ? 'bg-muted' : ''}
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={editor.isActive('italic') ? 'bg-muted' : ''}
          >
            <Italic className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={editor.isActive('strike') ? 'bg-muted' : ''}
          >
            <Strikethrough className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={editor.isActive({ textAlign: 'left' }) ? 'bg-muted' : ''}
          >
            <AlignLeft className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={editor.isActive({ textAlign: 'center' }) ? 'bg-muted' : ''}
          >
            <AlignCenter className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={editor.isActive({ textAlign: 'right' }) ? 'bg-muted' : ''}
          >
            <AlignRight className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={editor.isActive('bulletList') ? 'bg-muted' : ''}
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={editor.isActive('orderedList') ? 'bg-muted' : ''}
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={editor.isActive('blockquote') ? 'bg-muted' : ''}
          >
            <Quote className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addLink}
          >
            <LinkIcon className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().unsetLink().run()}
            disabled={!editor.isActive('link')}
          >
            <Unlink className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggleHtmlView}
            className={showHtml ? 'bg-muted' : ''}
          >
            <Code className="h-4 w-4" />
          </Button>
        </div>
      )}

      {showHtml ? (
        <textarea
          value={htmlContent}
          onChange={handleHtmlChange}
          className="w-full p-4 min-h-[200px] font-mono text-sm border-0 resize-none focus:outline-none bg-gray-50"
          placeholder="Enter HTML content..."
        />
      ) : (
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none [&_.ProseMirror]:p-4 [&_.ProseMirror]:min-h-[250px] [&_.ProseMirror]:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:cursor-text"
          placeholder={placeholder}
        />
      )}

      {/* Link dialog */}
      <Dialog open={linkDialogOpen} onOpenChange={cancelLink}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Insert Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="link-url" required>URL</Label>
            <Input
              id="link-url"
              type="url"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => { setLinkUrl(e.target.value); setLinkError('') }}
              onKeyDown={(e) => e.key === 'Enter' && confirmLink()}
              autoFocus
            />
            {linkError && <p className="text-xs text-red-500 mt-1">{linkError}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelLink}>Cancel</Button>
            <Button type="button" onClick={confirmLink}>Insert</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
})

RichTextEditor.displayName = 'RichTextEditor'

export { RichTextEditor }
