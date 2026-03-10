'use client';
import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Highlight } from '@tiptap/extension-highlight';
import { CharacterCount } from '@tiptap/extension-character-count';

interface RichEditorProps {
    value: string;
    onChange: (html: string) => void;
}

export default function RichEditor({ value, onChange }: RichEditorProps) {
    const editor = useEditor({
        immediatelyRender: false,
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
                bulletList: { keepMarks: true },
                orderedList: { keepMarks: true },
            }),
            Placeholder.configure({
                placeholder: 'Start writing your article here...\n\nTip: Use the toolbar above to format your text — add headings, bold, lists, links, and more!',
            }),
            Underline,
            Link.configure({ openOnClick: false, autolink: true }),
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Highlight.configure({ multicolor: false }),
            CharacterCount,
        ],
        content: value,
        onUpdate({ editor }) {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'tiptap-editor-body',
            },
        },
    });

    if (!editor) return null;

    const wordCount = (editor.storage.characterCount as { words?: () => number })?.words?.() ?? 0;

    const btn = (action: () => void, isActive: boolean, title: string, children: React.ReactNode) => (
        <button
            type="button"
            onClick={action}
            title={title}
            className={`toolbar-btn ${isActive ? 'is-active' : ''}`}
        >
            {children}
        </button>
    );

    const setLink = () => {
        const url = window.prompt('Enter URL:');
        if (!url) return;
        editor.chain().focus().setLink({ href: url }).run();
    };

    return (
        <div className="rich-editor-wrap">
            {/* ── Toolbar ── */}
            <div className="editor-toolbar">
                {/* Heading dropdown */}
                <div className="toolbar-group">
                    <select
                        className="toolbar-select"
                        onChange={(e) => {
                            const v = e.target.value;
                            if (v === 'p') editor.chain().focus().setParagraph().run();
                            else editor.chain().focus().toggleHeading({ level: Number(v) as 1 | 2 | 3 }).run();
                        }}
                        value={
                            editor.isActive('heading', { level: 1 }) ? '1' :
                                editor.isActive('heading', { level: 2 }) ? '2' :
                                    editor.isActive('heading', { level: 3 }) ? '3' : 'p'
                        }
                    >
                        <option value="p">Paragraph</option>
                        <option value="1">Heading 1</option>
                        <option value="2">Heading 2</option>
                        <option value="3">Heading 3</option>
                    </select>
                </div>

                <div className="toolbar-divider" />

                {/* Text formatting */}
                <div className="toolbar-group">
                    {btn(() => editor.chain().focus().toggleBold().run(), editor.isActive('bold'), 'Bold (Ctrl+B)', <strong>B</strong>)}
                    {btn(() => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'), 'Italic (Ctrl+I)', <em>I</em>)}
                    {btn(() => editor.chain().focus().toggleUnderline().run(), editor.isActive('underline'), 'Underline', <u>U</u>)}
                    {btn(() => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'), 'Strikethrough', <s>S</s>)}
                    {btn(() => editor.chain().focus().toggleHighlight().run(), editor.isActive('highlight'), 'Highlight', <span>🖊</span>)}
                </div>

                <div className="toolbar-divider" />

                {/* Alignment */}
                <div className="toolbar-group">
                    {btn(() => editor.chain().focus().setTextAlign('left').run(), editor.isActive({ textAlign: 'left' }), 'Align Left', <span>⬛</span>)}
                    {btn(() => editor.chain().focus().setTextAlign('center').run(), editor.isActive({ textAlign: 'center' }), 'Center', <span>▣</span>)}
                    {btn(() => editor.chain().focus().setTextAlign('right').run(), editor.isActive({ textAlign: 'right' }), 'Align Right', <span>▶</span>)}
                </div>

                <div className="toolbar-divider" />

                {/* Lists */}
                <div className="toolbar-group">
                    {btn(() => editor.chain().focus().toggleBulletList().run(), editor.isActive('bulletList'), 'Bullet List', <span>• List</span>)}
                    {btn(() => editor.chain().focus().toggleOrderedList().run(), editor.isActive('orderedList'), 'Numbered List', <span>1. List</span>)}
                </div>

                <div className="toolbar-divider" />

                {/* Special blocks */}
                <div className="toolbar-group">
                    {btn(() => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote'), 'Quote Block', <span>❝</span>)}
                    {btn(() => editor.chain().focus().toggleCodeBlock().run(), editor.isActive('codeBlock'), 'Code Block', <span>{'</>'}</span>)}
                    {btn(() => editor.chain().focus().toggleCode().run(), editor.isActive('code'), 'Inline Code', <code>code</code>)}
                </div>

                <div className="toolbar-divider" />

                {/* Link & HR */}
                <div className="toolbar-group">
                    {btn(setLink, editor.isActive('link'), 'Insert Link', <span>🔗</span>)}
                    {editor.isActive('link') && btn(() => editor.chain().focus().unsetLink().run(), false, 'Remove Link', <span>✕</span>)}
                    {btn(() => editor.chain().focus().setHorizontalRule().run(), false, 'Divider', <span>—</span>)}
                </div>

                <div className="toolbar-divider" />

                {/* Undo/Redo */}
                <div className="toolbar-group">
                    {btn(() => editor.chain().focus().undo().run(), false, 'Undo (Ctrl+Z)', <span>↩</span>)}
                    {btn(() => editor.chain().focus().redo().run(), false, 'Redo (Ctrl+Y)', <span>↪</span>)}
                </div>

                <div className="toolbar-word-count">{wordCount} words</div>
            </div>

            {/* ── Editor Body ── */}
            <EditorContent editor={editor} className="tiptap-editor-wrap" />
        </div>
    );
}
