export function groupArray<T extends any>(arr: T[]): T[][] {
  const groups: T[][] = []
  let currentGroup: T[] = []

  for (let i = 0; i < arr.length; i++) {
    currentGroup.push(arr[i])

    if (currentGroup.length === 50 || i === arr.length - 1) {
      groups.push(currentGroup)
      currentGroup = []
    }
  }

  return groups
}
