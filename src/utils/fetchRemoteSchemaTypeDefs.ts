import fetch from "node-fetch"

async function fetchRemoteSchemaTypeDefs(url: string) {
  let timer

  const response = await Promise.race([
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "app-version": "66",
      },
      body: JSON.stringify({
        query: `
        query sdl{
             _service{
                sdl
               }
            }
         `,
      }),
    }),
    new Promise(function (_, reject) {
      timer = setTimeout(() => reject(new Error("request timeout")), 15000)
    }),
  ])

  clearTimeout(timer)
  const { data } = await (response as any).json()
  const backendTypeDefs = data._service.sdl as string
  return backendTypeDefs
}

export default fetchRemoteSchemaTypeDefs
