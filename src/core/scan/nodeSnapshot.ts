import type { NodeSnapshot } from '../../shared/types'

function truncate(value: string, maxLength: number) {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`
}

function getPageName(node: BaseNode) {
  let current: BaseNode | null = node

  while (current) {
    if (current.type === 'PAGE') {
      return current.name
    }
    current = current.parent
  }

  return figma.currentPage.name
}

function summarizeSolidPaint(paint: SolidPaint) {
  const red = Math.round(paint.color.r * 255)
  const green = Math.round(paint.color.g * 255)
  const blue = Math.round(paint.color.b * 255)
  const opacity = paint.opacity ?? 1
  return `solid rgb(${red}, ${green}, ${blue}) opacity ${opacity.toFixed(2)}`
}

function summarizeGradientPaint(paint: GradientPaint) {
  return `${paint.type.toLowerCase()} gradient with ${paint.gradientStops.length} stops`
}

function summarizePaint(paint: Paint) {
  if (paint.visible === false) {
    return null
  }

  if (paint.type === 'SOLID') {
    return summarizeSolidPaint(paint)
  }

  if (paint.type === 'IMAGE') {
    return 'image fill'
  }

  if (paint.type === 'VIDEO') {
    return 'video fill'
  }

  if (paint.type === 'PATTERN') {
    return 'pattern fill'
  }

  return summarizeGradientPaint(paint)
}

function summarizePaintList(node: SceneNode, key: 'fills' | 'strokes') {
  const paints =
    key === 'fills'
      ? 'fills' in node
        ? node.fills
        : []
      : 'strokes' in node
        ? node.strokes
        : []

  if (paints === figma.mixed || !Array.isArray(paints)) {
    return []
  }

  return paints
    .map((paint) => summarizePaint(paint))
    .filter((paint): paint is string => paint !== null)
    .slice(0, 3)
}

function summarizeEffects(node: SceneNode) {
  if (!('effects' in node) || !Array.isArray(node.effects)) {
    return []
  }

  return node.effects
    .filter((effect) => effect.visible !== false)
    .map((effect) => effect.type.toLowerCase())
    .slice(0, 3)
}

function getFontName(node: SceneNode) {
  if (node.type !== 'TEXT') {
    return null
  }

  if (node.fontName === figma.mixed) {
    return 'mixed'
  }

  return `${node.fontName.family} ${node.fontName.style}`
}

function getFontSize(node: SceneNode) {
  if (node.type !== 'TEXT') {
    return null
  }

  return typeof node.fontSize === 'number' ? node.fontSize : null
}

function getTextContent(node: SceneNode) {
  if (node.type !== 'TEXT') {
    return null
  }

  return truncate(node.characters, 200)
}

function getCharactersLength(node: SceneNode) {
  if (node.type !== 'TEXT') {
    return null
  }

  return node.characters.length
}

function getLayoutMode(node: SceneNode) {
  return 'layoutMode' in node ? node.layoutMode : null
}

function getItemSpacing(node: SceneNode) {
  return 'itemSpacing' in node ? node.itemSpacing : null
}

function getPadding(node: SceneNode) {
  if (!('paddingTop' in node)) {
    return {
      top: null,
      right: null,
      bottom: null,
      left: null,
    }
  }

  return {
    top: node.paddingTop,
    right: node.paddingRight,
    bottom: node.paddingBottom,
    left: node.paddingLeft,
  }
}

function getVariantProperties(node: SceneNode) {
  if (!('variantProperties' in node) || !node.variantProperties) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(node.variantProperties).map(([key, value]) => [key, String(value)]),
  )
}

function getComponentPropertyKeys(node: SceneNode) {
  if (!('componentProperties' in node) || !node.componentProperties) {
    return []
  }

  return Object.keys(node.componentProperties)
}

function getSize(node: SceneNode) {
  if (!('width' in node) || !('height' in node)) {
    return {
      width: null,
      height: null,
    }
  }

  return {
    width: Math.round(node.width * 100) / 100,
    height: Math.round(node.height * 100) / 100,
  }
}

function getPosition(node: SceneNode) {
  if (!('x' in node) || !('y' in node)) {
    return {
      x: null,
      y: null,
    }
  }

  return {
    x: Math.round(node.x * 100) / 100,
    y: Math.round(node.y * 100) / 100,
  }
}

export function createNodeSnapshot(node: SceneNode): NodeSnapshot {
  const size = getSize(node)
  const position = getPosition(node)

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    pageName: getPageName(node),
    parentName: node.parent && 'name' in node.parent ? node.parent.name : null,
    visible: node.visible,
    width: size.width,
    height: size.height,
    x: position.x,
    y: position.y,
    opacity: 'opacity' in node ? node.opacity : null,
    fills: summarizePaintList(node, 'fills'),
    strokes: summarizePaintList(node, 'strokes'),
    effects: summarizeEffects(node),
    layoutMode: getLayoutMode(node),
    itemSpacing: getItemSpacing(node),
    padding: getPadding(node),
    textContent: getTextContent(node),
    fontSize: getFontSize(node),
    fontName: getFontName(node),
    charactersLength: getCharactersLength(node),
    childCount: 'children' in node ? node.children.length : 0,
    componentPropertyKeys: getComponentPropertyKeys(node),
    variantProperties: getVariantProperties(node),
  }
}

function isRelevantNode(node: SceneNode) {
  return node.visible && node.type !== 'SLICE'
}

export function getSelectionSnapshots() {
  return figma.currentPage.selection.filter(isRelevantNode).map(createNodeSnapshot)
}

export function getChangedNodeSnapshots(nodeIds: Iterable<string>) {
  const snapshots: NodeSnapshot[] = []

  for (const nodeId of nodeIds) {
    const node = figma.getNodeById(nodeId)

    if (node && node.type !== 'PAGE' && node.type !== 'DOCUMENT' && node.type !== 'SECTION') {
      if ('visible' in node && isRelevantNode(node)) {
        snapshots.push(createNodeSnapshot(node))
      }
    }
  }

  return snapshots
}

export function getPageScanSnapshots(limit = 150) {
  return figma.currentPage
    .findAll((node) => isRelevantNode(node))
    .slice(0, limit)
    .map(createNodeSnapshot)
}
