'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { TableRow, TableCell } from '@/components/ui/table'

const WIDTHS = ['w-[200px]', 'w-[100px]', 'w-[120px]', 'w-[80px]', 'w-[60px]', 'w-[40px]']

interface SkeletonRowsProps {
  rows?: number
  columns?: number
}

export default function SkeletonRows({ rows = 8, columns = 6 }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i}>
          {Array.from({ length: columns }, (_, j) => (
            <TableCell key={j}>
              <Skeleton className={`h-4 ${WIDTHS[j % WIDTHS.length]}`} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}
