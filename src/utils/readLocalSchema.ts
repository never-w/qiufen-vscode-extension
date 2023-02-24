import fs from "fs"

function readLocalSchema(filePath: string) {
  fs.readFileSync(filePath)
}

export default readLocalSchema
