import express from "express"

const router = express.Router()

const createViewDocControllerController = () => {
  router.use("/static", express.static(__dirname + "../files"))

  return router
}

export default createViewDocControllerController
