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
import { ArrowUpDown, PencilLine } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
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
          <ArrowUpDown className="ml-2 h-4 w-4" />
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
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div>{row.getValue("maxValue")}</div>,
    },
    {
      accessorKey: "enabled",
      header: "Status",
      cell: ({ row }) => (
        <div className="text-center">{row.getValue("enabled") ? "Enable" : "Disable"}</div>
      ),
    },
    {
      id: "actions",
      header: "Edit",  // Added Edit header
      enableHiding: false,
      cell: ({ row }) => {
        const sensor = row.original
        return (
          <div className="flex justify-center">
            <Button 
              variant="outline"
              size="icon"
              className="h-8 w-8"
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
              <PencilLine className="h-4 w-4" />
            </Button>
          </div>
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
    <div className="w-full pt-15 px-5">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="text-center">
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
                    <TableCell key={cell.id} className="text-center">
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
    </div>
  )
}