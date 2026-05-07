# Merge Two Sorted Arrays - Visualization Example

Let's trace the merge process for `nums1 = [1, 3, 5]` and `nums2 = [2, 4]`.

We start by comparing the first elements: `nums1[0] = 1` and `nums2[0] = 2`. Since `1` is smaller, we add `1` to the result array.

{{VISUALIZATION:two-pointers:[1,3,5],0,[2,4],0}}

Now our result array is `[1]`.

Next, we compare `nums1[1] = 3` and `nums2[0] = 2`. Since `2` is smaller, we add `2` to the result array.

{{VISUALIZATION:two-pointers:[1,3,5],1,[2,4],0}}

Now our result array is `[1, 2]`.

We continue this process. What do you think the next step is?

---

## How to Use in React

```tsx
import { VisualizationText } from "@/components/VisualizationText";

export function ExampleComponent() {
  const text = `Let's trace the merge process for nums1 = [1, 3, 5] and nums2 = [2, 4].

We start by comparing the first elements: nums1[0] = 1 and nums2[0] = 2. Since 1 is smaller, we add 1 to the result array.

{{VISUALIZATION:two-pointers:[1,3,5],0,[2,4],0}}

Now our result array is [1].

Next, we compare nums1[1] = 3 and nums2[0] = 2. Since 2 is smaller, we add 2 to the result array.

{{VISUALIZATION:two-pointers:[1,3,5],1,[2,4],0}}

Now our result array is [1, 2].`;

  return <VisualizationText text={text} />;
}
```

## Correct Data Formats

### Two Pointers (Merge Arrays)
`{{VISUALIZATION:two-pointers:[nums1,i,nums2,j]}}`
- nums1: First array
- i: Pointer index in nums1
- nums2: Second array  
- j: Pointer index in nums2

### Two Pointers (Single Array)
`{{VISUALIZATION:two-pointers:[array,left,right,target,sum]}}`
- array: The array being processed
- left: Left pointer index
- right: Right pointer index
- target: Target value (optional)
- sum: Current sum (optional)

### Binary Search
`{{VISUALIZATION:binary-search:[array,left,right,mid,target]}}`
- array: Sorted array
- left: Left boundary
- right: Right boundary
- mid: Middle index
- target: Value being searched

### Sliding Window
`{{VISUALIZATION:sliding-window:[string,start,end,result]}}`
- string: Input string
- start: Window start index
- end: Window end index
- result: Current result (optional)
