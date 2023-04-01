// @ts-nocheck
import { parse, print, FieldNode, OperationDefinitionNode, DefinitionNode, visit, DocumentNode } from 'graphql'

// 使用类型别名简化类型定义
type UpdateInfo = {
  paramName: string
  newParamType: string
  fieldToUpdate: string
  updatedField: string
}

// 将本地查询更新为远程查询
function updateLocalOperation(localOperation: string, remoteOperation: string, updateInfo: UpdateInfo): string {
  // 解析本地和远程查询
  const localAst: DocumentNode = parse(localOperation)
  const remoteAst: DocumentNode = parse(remoteOperation)

  // 使用visitor模式遍历并更新AST
  const updatedAst: DocumentNode = visit(localAst, {
    OperationDefinition: {
      enter(node: OperationDefinitionNode) {
        node.variableDefinitions?.forEach((variableDefinition) => {
          if (variableDefinition.variable.name.value === updateInfo.paramName) {
            const matchingVariable = remoteAst.definitions
              .flatMap((def: DefinitionNode) => ('variableDefinitions' in def ? def.variableDefinitions : []))
              .find((remoteVarDef) => remoteVarDef.variable.name.value === updateInfo.paramName)

            if (matchingVariable) {
              variableDefinition.type = matchingVariable.type
            }
          }
        })
      },
    },
    Field: {
      enter(node: FieldNode) {
        if (node.name.value === updateInfo.fieldToUpdate) {
          const matchingField = remoteAst.definitions
            .flatMap((def: DefinitionNode) =>
              'selectionSet' in def ? def.selectionSet.selections.flatMap((field: FieldNode) => (field.name.value === updateInfo.fieldToUpdate ? [field] : [])) : [],
            )
            .find((remoteField) => remoteField.name.value === updateInfo.fieldToUpdate)

          if (matchingField) {
            node.selectionSet = matchingField.selectionSet
          }
        }

        if (node.alias && node.alias.value === updateInfo.fieldToUpdate) {
          node.alias.value = updateInfo.updatedField
        }
      },
    },
  })

  // 生成并返回更新的操作字符串
  return print(updatedAst)
}
