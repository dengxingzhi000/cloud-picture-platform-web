import { useMemo, useState } from 'react'
import FilerobotImageEditor, { TABS, TOOLS } from 'react-filerobot-image-editor'
import type { FilerobotImageEditorConfig } from 'react-filerobot-image-editor'
import './standard-picture-editor.css'

type StandardPictureEditorProps = {
  pictureUrl: string
  pictureName?: string
  pictureWidth?: number | null
  pictureHeight?: number | null
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'edited-picture'
}

function triggerDownload(url: string, filename: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
}

export default function StandardPictureEditor({
  pictureUrl,
  pictureName,
  pictureWidth,
  pictureHeight,
}: StandardPictureEditorProps) {
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const editorConfig = useMemo<FilerobotImageEditorConfig>(
    () => ({
      source: pictureUrl,
      tabsIds: [TABS.ADJUST, TABS.ANNOTATE, TABS.FILTERS, TABS.RESIZE, TABS.FINETUNE],
      defaultTabId: TABS.ADJUST,
      defaultToolId: TOOLS.CROP,
      defaultSavedImageName: sanitizeFileName(pictureName ?? 'edited-picture'),
      defaultSavedImageType: 'png',
      defaultSavedImageQuality: 0.92,
      showBackButton: false,
      closeAfterSave: false,
      savingPixelRatio: 1,
      previewPixelRatio: 1,
      observePluginContainerSize: true,
      useZoomPresetsMenu: true,
      annotationsCommon: {
        fill: 'rgba(15, 118, 110, 0.16)',
        stroke: '#0f766e',
        strokeWidth: 3,
      },
      Text: {
        fonts: ['Georgia', 'Trebuchet MS', 'Courier New'],
        fontSize: 28,
        stroke: '#e85d04',
        fill: '#1f2937',
      },
      Crop: {
        ratio: 'original',
        autoResize: true,
      },
      onSave: async (savedImageData) => {
        const extension = savedImageData.extension || 'png'
        const filename = `${sanitizeFileName(pictureName ?? 'edited-picture')}.${extension}`

        if (savedImageData.imageCanvas) {
          const blob = await new Promise<Blob | null>((resolve) => {
            savedImageData.imageCanvas?.toBlob(resolve, savedImageData.mimeType, savedImageData.quality)
          })
          if (blob) {
            const objectUrl = URL.createObjectURL(blob)
            triggerDownload(objectUrl, filename)
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1_000)
            setSaveMessage(`Saved ${filename} to your downloads.`)
            return
          }
        }

        if (savedImageData.imageBase64) {
          triggerDownload(savedImageData.imageBase64, filename)
          setSaveMessage(`Saved ${filename} to your downloads.`)
          return
        }

        setSaveMessage('The editor completed the export, but no downloadable image payload was returned.')
      },
    }),
    [pictureName, pictureUrl]
  )

  return (
    <section className="standard-editor" aria-label="professional picture editor">
      <div className="standard-editor__hero">
        <div className="standard-editor__copy">
          <p className="standard-editor__eyebrow">Professional Editor</p>
          <h2 className="standard-editor__title">Image-first editing for standalone assets</h2>
          <p className="standard-editor__subtitle">
            Crop, annotate, refine, and export without entering the team collaboration workspace.
          </p>
        </div>
        <div className="standard-editor__facts">
          <span>{pictureWidth && pictureHeight ? `${pictureWidth} x ${pictureHeight}` : 'Responsive fit'}</span>
          <span>Tabs separated by task</span>
          <span>Export to local file</span>
        </div>
      </div>

      {saveMessage ? <div className="standard-editor__notice">{saveMessage}</div> : null}

      <div className="standard-editor__frame">
        <FilerobotImageEditor {...editorConfig} />
      </div>
    </section>
  )
}
