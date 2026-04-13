/**
 * Inject once in the (dashboard) layout. Provides feTurbulence filters used
 * by BubbleAvatar to create organic, holographic textures on the 5 gradient
 * families (sageHaze, duskRose, aurora, mist, blueDusk).
 *
 * Ported 1:1 from snew-ai-core designSystem.tsx SVGFilters component.
 * Server Component (no interactivity).
 */

const SVG_FILTERS_HTML = `<svg width="0" height="0" style="position:absolute">
  <filter id="snew-f-sageHaze"><feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="3" seed="2"/><feDisplacementMap in="SourceGraphic" scale="12"/></filter>
  <filter id="snew-f-duskRose"><feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed="7"/><feDisplacementMap in="SourceGraphic" scale="10"/></filter>
  <filter id="snew-f-aurora"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="14"/><feDisplacementMap in="SourceGraphic" scale="14"/></filter>
  <filter id="snew-f-mist"><feTurbulence type="fractalNoise" baseFrequency="0.028" numOctaves="3" seed="21"/><feDisplacementMap in="SourceGraphic" scale="11"/></filter>
  <filter id="snew-f-blueDusk"><feTurbulence type="fractalNoise" baseFrequency="0.022" numOctaves="3" seed="33"/><feDisplacementMap in="SourceGraphic" scale="13"/></filter>
</svg>`

export function SvgFilters() {
  return (
    <div
      aria-hidden
      style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}
      dangerouslySetInnerHTML={{ __html: SVG_FILTERS_HTML }}
    />
  )
}
