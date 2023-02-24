async function fetchRemoteSchemaTypeDefs(url: string) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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
  })

  const { data } = (await response.json()) as any
  const backendTypeDefs = data._service.sdl as string
  return backendTypeDefs
}

export default fetchRemoteSchemaTypeDefs
