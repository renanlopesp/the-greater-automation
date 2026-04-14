'use client'

import React, { useRef, useCallback } from 'react'
import { Upload, X } from 'lucide-react'

export interface ReferenceImage {
  id: string
  dataUrl: string
  base64: string
  mimeType: string
}

interface Product {
  id: string
  name: string
  sku?: string
  image: string
}

interface ImageUploadPanelProps {
  activeProductImage: string | null
  onProductImageUpload: (dataUrl: string) => void
  onProductImageClear: () => void
  referenceImages: ReferenceImage[]
  onReferenceImagesAdd: (images: ReferenceImage[]) => void
  onReferenceImageRemove: (id: string) => void
  onReferenceImagesClear: () => void
  products?: Product[]
  selectedProductIds?: string[]
  onProductSelect?: (productId: string) => void
  onProductDeselect?: (productId: string) => void
}

const MAX_REFS = 5

const readFilesAsBase64 = (files: File[]): Promise<ReferenceImage[]> =>
  Promise.all(
    files.map(
      (file, i) =>
        new Promise<ReferenceImage>((resolve) => {
          const reader = new FileReader()
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string
            resolve({
              id: `ref-${Date.now()}-${i}`,
              dataUrl,
              base64: dataUrl.split(',')[1],
              mimeType: file.type || 'image/jpeg',
            })
          }
          reader.readAsDataURL(file)
        })
    )
  )

export const ImageUploadPanel: React.FC<ImageUploadPanelProps> = ({
  activeProductImage,
  onProductImageUpload,
  onProductImageClear,
  referenceImages,
  onReferenceImagesAdd,
  onReferenceImageRemove,
  onReferenceImagesClear,
  products = [],
  selectedProductIds = [],
  onProductSelect,
  onProductDeselect,
}) => {
  const productInputRef = useRef<HTMLInputElement>(null)
  const refInputRef = useRef<HTMLInputElement>(null)
  const openProductPicker = useCallback(() => productInputRef.current?.click(), [])
  const openRefPicker = useCallback(() => refInputRef.current?.click(), [])

  const handleProductFiles = useCallback(
    async (files: FileList | File[]) => {
      const file = Array.from(files).find((f) => f.type.startsWith('image/'))
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        onProductImageUpload(dataUrl)
      }
      reader.readAsDataURL(file)
    },
    [onProductImageUpload]
  )

  const handleRefFiles = useCallback(
    async (files: FileList | File[]) => {
      const remaining = MAX_REFS - referenceImages.length
      if (remaining <= 0) return
      const validFiles = Array.from(files)
        .filter((f) => f.type.startsWith('image/'))
        .slice(0, remaining)
      if (!validFiles.length) return
      const newImages = await readFilesAsBase64(validFiles)
      onReferenceImagesAdd(newImages)
    },
    [referenceImages.length, onReferenceImagesAdd]
  )

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    margin: 0,
  }

  const uploadZone = (
    onClick: () => void,
    onDrop: (files: FileList) => void,
    label: string,
    sublabel: string,
    disabled = false
  ) => (
    <div
      onClick={disabled ? undefined : onClick}
      onDragOver={(e) => {
        if (disabled) return
        e.preventDefault()
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
      }}
      onDragLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
      }}
      onDrop={(e) => {
        e.preventDefault()
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
        e.currentTarget.style.background = 'rgba(255,255,255,0.02)'
        if (!disabled) onDrop(e.dataTransfer.files)
      }}
      style={{
        border: `1.5px dashed ${disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 10,
        padding: '16px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        background: 'rgba(255,255,255,0.02)',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          flexShrink: 0,
          background: 'rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Upload size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
      </div>
      <div>
        <p
          style={{
            fontSize: 12,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.75)',
            margin: '0 0 2px',
          }}
        >
          {label}
        </p>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0 }}>{sublabel}</p>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '4px 0' }}>
      {/* ── SECTION 1: Product image ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <p style={sectionLabel}>Foto do produto</p>

        {activeProductImage ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.04)',
            }}
          >
            <img
              src={activeProductImage}
              alt="Produto"
              style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.8)',
                  margin: '0 0 2px',
                }}
              >
                Imagem carregada
              </p>
              <button
                onClick={() => productInputRef.current?.click()}
                style={{
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
              >
                Trocar imagem
              </button>
            </div>
            <button
              onClick={onProductImageClear}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: 'rgba(255,255,255,0.06)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'rgba(255,255,255,0.4)',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
                e.currentTarget.style.color = '#EF4444'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
              }}
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          uploadZone(
            // eslint-disable-next-line react-hooks/refs -- click handler invokes the ref on user action
            openProductPicker,
            (files) => handleProductFiles(files),
            'Upload da foto do produto',
            'JPG, PNG, WEBP — 1 imagem'
          )
        )}

        <input
          ref={productInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) handleProductFiles(e.target.files)
            e.target.value = ''
          }}
        />

        {products.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <p style={{ ...sectionLabel, margin: '4px 0 4px' }}>
              {activeProductImage ? 'ou escolher do catálogo' : 'Escolher produto'}
            </p>
            {products.slice(0, 4).map((p) => {
              const isActive = selectedProductIds.includes(p.id)
              return (
                <div
                  key={p.id}
                  style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 0 }}
                >
                  <button
                    onClick={() => onProductSelect?.(p.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: `1px solid ${isActive ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      background: isActive ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                      fontFamily: 'inherit',
                      flex: 1,
                      minWidth: 0,
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = isActive
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.03)')
                    }
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 6,
                        objectFit: 'cover',
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 400,
                          color: 'rgba(255,255,255,0.8)',
                          display: 'block',
                        }}
                      >
                        {p.name}
                      </span>
                      {p.sku && (
                        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                          {p.sku}
                        </span>
                      )}
                    </div>
                    {isActive && (
                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}>
                        ✓
                      </span>
                    )}
                  </button>
                  {isActive && onProductDeselect && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onProductDeselect(p.id)
                      }}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.06)',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.35)',
                        flexShrink: 0,
                        marginLeft: 4,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.2)'
                        e.currentTarget.style.color = '#EF4444'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                        e.currentTarget.style.color = 'rgba(255,255,255,0.35)'
                      }}
                      title="Remover produto"
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

      {/* ── SECTION 2: Reference images ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={sectionLabel}>
            Referências visuais ({referenceImages.length}/{MAX_REFS})
          </p>
          {referenceImages.length > 0 && (
            <button
              onClick={onReferenceImagesClear}
              style={{
                fontSize: 10,
                color: 'rgba(255,255,255,0.3)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
            >
              Limpar tudo
            </button>
          )}
        </div>

        {referenceImages.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {referenceImages.map((img) => (
              <div key={img.id} style={{ position: 'relative' }}>
                <img
                  src={img.dataUrl}
                  alt=""
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 8,
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
                <button
                  onClick={() => onReferenceImageRemove(img.id)}
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#EF4444',
                    border: '2px solid #1A1A1A',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: 9,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    lineHeight: 1,
                  }}
                >
                  ✕
                </button>
              </div>
            ))}

            {referenceImages.length < MAX_REFS && (
              <button
                onClick={() => refInputRef.current?.click()}
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 8,
                  border: '1.5px dashed rgba(255,255,255,0.15)',
                  background: 'rgba(255,255,255,0.03)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.3)',
                  flexShrink: 0,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.4)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.7)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
                  e.currentTarget.style.color = 'rgba(255,255,255,0.3)'
                }}
                title={`Adicionar referência (${referenceImages.length}/${MAX_REFS})`}
              >
                <span style={{ fontSize: 20, lineHeight: 1, marginTop: -1 }}>+</span>
              </button>
            )}
          </div>
        )}

        {referenceImages.length === 0 &&
          uploadZone(
            // eslint-disable-next-line react-hooks/refs -- click handler invokes the ref on user action
            openRefPicker,
            (files) => handleRefFiles(files),
            'Upload de referências visuais',
            `JPG, PNG — até ${MAX_REFS} imagens`
          )}

        <input
          ref={refInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files) handleRefFiles(e.target.files)
            e.target.value = ''
          }}
        />

        <p
          style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          A IA usa essas imagens como direção visual — paleta, composição, estilo. Não copia os
          objetos.
        </p>
      </div>
    </div>
  )
}
