"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import { ArrowUpDown, MoreHorizontal } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { getSensorSettings, SensorSettingsResponse } from "@/actions/get-sensor-settings"
import { useStoreDevice, useSensorModal } from "@/hooks/use-store-modal"

type SensorRow = {
  id: number
  sensorName: string
  minValue: number
  maxValue: number
  enabled: boolean
}

type Props = {
  refreshCounter: number
}

export default function SensorSettingsTable({ refreshCounter }: Props) {
  const activeDevice = useStoreDevice((s) => s.activeDevice)
  const deviceId = activeDevice?.id || ""
  const openModal = useSensorModal((s) => s.onOpen)

  const [data, setData] = React.useState<SensorRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})

  React.useEffect(() => {
    if (!deviceId) {
      setData([])
      setLoading(false)
      return
    }
    let isMounted = true

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const resp: SensorSettingsResponse = await getSensorSettings(deviceId)
        const rows = resp.sensor.map((s) => ({
          id: s.id,
          sensorName: s.type.charAt(0) + s.type.slice(1).toLowerCase(),
          minValue: s.minValue,
          maxValue: s.maxValue,
          enabled: s.enabled,
        }))
        if (isMounted) setData(rows)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        if (isMounted) setError(err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
   load()
   // pasang listener, supaya kalau modal dispatch event, kita reload
  return () => {
     isMounted = false
   }
  }, [deviceId, refreshCounter])

  const columns = React.useMemo<ColumnDef<SensorRow>[]>(() => [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(v) => row.toggleSelected(!!v)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "sensorName",
      header: "Sensor Name",
      cell: ({ row }) => <div className="capitalize">{row.getValue("sensorName")}</div>,
    },
    {
      accessorKey: "minValue",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Min Value
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => <div>{row.getValue("minValue")}</div>,
    },
    {
      accessorKey: "maxValue",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Max Value
          <ArrowUpDown />
        </Button>
      ),
      cell: ({ row }) => <div>{row.getValue("maxValue")}</div>,
    },
    // **Baru: kolom Status**
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => (
        <div>{row.getValue("enabled") ? "Enable" : "Disable"}</div>
      ),
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const sensor = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() =>
                  openModal({
                    id: sensor.id,
                    type: sensor.sensorName.toUpperCase(),
                    deviceId,
                    minValue: sensor.minValue,
                    maxValue: sensor.maxValue,
                    enabled: sensor.enabled,
                  })
                }
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View details</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ], [openModal, deviceId])

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters, columnVisibility, rowSelection },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
  })

  if (!deviceId) return <div>Select a device to view settings.</div>
  if (loading) return <div>Loading sensor settings…</div>
  if (error) return <div className="text-red-600">Error: {error}</div>

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id}>
                    {!header.isPlaceholder &&
                      flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
