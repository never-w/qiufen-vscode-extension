import { NewFieldNodeType } from './interface'

export function resolveOperationDefsForFieldNodeTree(fieldNode: NewFieldNodeType) {
  const newFieldNode = { ...fieldNode }

  if (newFieldNode?.selectionSet) {
    newFieldNode.children = newFieldNode?.selectionSet?.selections.map((itm) => resolveOperationDefsForFieldNodeTree(itm as NewFieldNodeType)) as NewFieldNodeType[]
    delete newFieldNode?.selectionSet
  }

  return newFieldNode
}
