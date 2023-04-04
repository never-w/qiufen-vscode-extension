import { NewFieldNodeType } from './interface'

export function resolveOperationDefsForFieldNodeTree(fieldNode: NewFieldNodeType, depth = 0) {
  const newFieldNode = { ...fieldNode, depth }

  if (newFieldNode?.selectionSet) {
    newFieldNode.children = newFieldNode?.selectionSet?.selections.map((itm) =>
      resolveOperationDefsForFieldNodeTree(itm as NewFieldNodeType, depth + 1),
    ) as NewFieldNodeType[]
    delete newFieldNode?.selectionSet
  }

  return newFieldNode
}

export function getOperationDefsForFieldNodeTreeDepthKeys(
  fieldNode: NewFieldNodeType,
  maxDepth: number,
  keys: string[] = [],
) {
  if (fieldNode.depth < maxDepth) {
    keys.push(fieldNode.fieldKey)
  }

  if (fieldNode?.children?.length) {
    fieldNode.children.forEach((child) => {
      getOperationDefsForFieldNodeTreeDepthKeys(child, maxDepth, keys)
    })
  }

  return keys
}
