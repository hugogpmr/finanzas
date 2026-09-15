"use client";

import { useMemo, useState, useTransition } from "react";
import Papa from "papaparse";
import { Upload } from "lucide-react";
import { commitImport, previewImport } from "./actions";
import type { ColumnMapping, ImportPreviewRow, RawCsvRow } from "./types";
import { sortCategoriesByHierarchy, type Category } from "@/features/categories/types";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AccountOption = { id: string; name: string; currency: string };

type Step = "upload" | "mapping" | "preview" | "done";

type CombinedRow = ImportPreviewRow & { included: boolean; categoryId: string };

const NO_COLUMN = "__none__";

function emptyMapping(): ColumnMapping {
  return { date: "", amount: "", merchant: "", description: "" };
}

export function ImportWizard({
  accounts,
  categories,
}: {
  accounts: AccountOption[];
  categories: Category[];
}) {
  const [step, setStep] = useState<Step>("upload");
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<RawCsvRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping());
  const [rows, setRows] = useState<CombinedRow[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const orderedCategories = useMemo(() => sortCategoriesByHierarchy(categories), [categories]);
  const account = accounts.find((a) => a.id === accountId);

  function reset() {
    setStep("upload");
    setHeaders([]);
    setRawRows([]);
    setMapping(emptyMapping());
    setRows([]);
    setError(null);
  }

  function handleFile(file: File) {
    setError(null);
    Papa.parse<RawCsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const fields = results.meta.fields ?? [];
        if (fields.length === 0 || results.data.length === 0) {
          setError("No se han detectado columnas o filas en el archivo.");
          return;
        }
        setHeaders(fields);
        setRawRows(results.data);
        setMapping({
          date: fields[0] ?? "",
          amount: fields[1] ?? "",
          merchant: "",
          description: fields[2] ?? "",
        });
        setStep("mapping");
      },
      error: (err) => setError(`No se pudo leer el archivo: ${err.message}`),
    });
  }

  function handleContinueMapping() {
    if (!mapping.date || !mapping.amount) {
      setError("Selecciona al menos las columnas de fecha e importe.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await previewImport(accountId, mapping, rawRows);
      if (result.error) {
        setError(result.error);
        return;
      }
      setRows(
        (result.rows ?? []).map((r) => ({
          ...r,
          included: r.date !== null && r.amount !== null && !r.isDuplicate,
          categoryId: r.suggestedCategoryId ?? NO_COLUMN,
        })),
      );
      setStep("preview");
    });
  }

  function updateRow(rowIndex: number, patch: Partial<CombinedRow>) {
    setRows((prev) => prev.map((r) => (r.rowIndex === rowIndex ? { ...r, ...patch } : r)));
  }

  function handleImport() {
    const toImport = rows.filter((r) => r.included && r.date !== null && r.amount !== null);
    if (toImport.length === 0) {
      setError("No hay filas seleccionadas para importar.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await commitImport(
        accountId,
        toImport.map((r) => ({
          date: r.date!,
          amount: r.amount!,
          merchant: r.merchant,
          description: r.description,
          categoryId: r.categoryId !== NO_COLUMN ? r.categoryId : null,
        })),
      );
      if (result.error) {
        setError(result.error);
        return;
      }
      setImportedCount(result.imported ?? 0);
      setStep("done");
    });
  }

  const includedCount = rows.filter((r) => r.included).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="import-account">Cuenta destino</Label>
        <Select
          value={accountId}
          onValueChange={(v) => setAccountId(v ?? "")}
          items={accounts.map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }))}
          disabled={step !== "upload"}
        >
          <SelectTrigger id="import-account" className="w-full max-w-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {step === "upload" && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed p-6">
          <p className="text-sm text-muted-foreground">
            Sube un CSV exportado de tu banco (fecha, importe y descripción por columnas).
          </p>
          <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm hover:bg-accent">
            <Upload className="size-4" />
            Elegir archivo CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      )}

      {step === "mapping" && (
        <div className="flex flex-col gap-4 rounded-lg border p-4">
          <p className="text-sm text-muted-foreground">
            {rawRows.length} filas detectadas. Indica qué columna de tu CSV es cada campo.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <MappingSelect
              label="Fecha"
              headers={headers}
              value={mapping.date}
              required
              onChange={(v) => setMapping((m) => ({ ...m, date: v }))}
            />
            <MappingSelect
              label="Importe"
              headers={headers}
              value={mapping.amount}
              required
              onChange={(v) => setMapping((m) => ({ ...m, amount: v }))}
            />
            <MappingSelect
              label="Comercio (opcional)"
              headers={headers}
              value={mapping.merchant}
              onChange={(v) => setMapping((m) => ({ ...m, merchant: v }))}
            />
            <MappingSelect
              label="Descripción (opcional)"
              headers={headers}
              value={mapping.description}
              onChange={(v) => setMapping((m) => ({ ...m, description: v }))}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>
              Cancelar
            </Button>
            <Button onClick={handleContinueMapping} disabled={isPending}>
              {isPending ? "Analizando..." : "Previsualizar"}
            </Button>
          </div>
        </div>
      )}

      {step === "preview" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {includedCount} de {rows.length} filas seleccionadas para importar en{" "}
            <span className="font-medium">{account?.name}</span>. Las marcadas como posible
            duplicado empiezan sin seleccionar.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Importe</TableHead>
                  <TableHead>Comercio/descripción</TableHead>
                  <TableHead className="w-52">Categoría</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const invalid = row.date === null || row.amount === null;
                  return (
                    <TableRow key={row.rowIndex}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="size-4 rounded border-input accent-foreground"
                          checked={row.included}
                          disabled={invalid}
                          onChange={(e) => updateRow(row.rowIndex, { included: e.target.checked })}
                        />
                      </TableCell>
                      <TableCell>{row.date ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.amount !== null ? formatCurrency(row.amount, account?.currency ?? "EUR") : "—"}
                      </TableCell>
                      <TableCell className="max-w-56 truncate text-muted-foreground">
                        {row.merchant ?? row.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={row.categoryId}
                          onValueChange={(v) => updateRow(row.rowIndex, { categoryId: v ?? NO_COLUMN })}
                          items={[
                            { value: NO_COLUMN, label: "Sin categorizar" },
                            ...orderedCategories.map((c) => ({ value: c.id, label: c.name })),
                          ]}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_COLUMN}>Sin categorizar</SelectItem>
                            {orderedCategories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.parent_id ? `— ${c.name}` : c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-xs">
                        {invalid ? (
                          <span className="text-destructive">Fecha o importe inválido</span>
                        ) : row.isDuplicate ? (
                          <span className="text-amber-600 dark:text-amber-500">Posible duplicado</span>
                        ) : (
                          <span className="text-muted-foreground">Nueva</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reset}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={isPending || includedCount === 0}>
              {isPending ? "Importando..." : `Importar ${includedCount} transacciones`}
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed p-6 text-center">
          <p className="text-sm">
            Se han importado <span className="font-medium">{importedCount}</span> transacciones en{" "}
            {account?.name}.
          </p>
          <Button className="w-fit self-center" onClick={reset}>
            Importar otro archivo
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function MappingSelect({
  label,
  headers,
  value,
  onChange,
  required,
}: {
  label: string;
  headers: string[];
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>
      <Select
        value={value || NO_COLUMN}
        onValueChange={(v) => onChange(v && v !== NO_COLUMN ? v : "")}
        items={[
          ...(required ? [] : [{ value: NO_COLUMN, label: "No mapear" }]),
          ...headers.map((h) => ({ value: h, label: h })),
        ]}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {!required && <SelectItem value={NO_COLUMN}>No mapear</SelectItem>}
          {headers.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
