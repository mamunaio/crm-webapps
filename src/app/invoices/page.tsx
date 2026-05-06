"use client";

import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { PaymentTag } from "@/components/SmartBadges";
import { predictPayment } from "@/lib/smart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatUSD, formatDate } from "@/lib/format";
import { toCSV, downloadCSV } from "@/lib/csv";
import { Plus, Trash2, Eye, Download, Check } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function InvoicesPageWrapper() {
  return (
    <RequireAuth>
      <InvoicesPage />
    </RequireAuth>
  );
}

type Item = { id?: string; description: string; quantity: number; unit_price: number; amount: number; position: number };
type Invoice = {
  id: string; invoice_number: string; client_name: string; client_email: string | null;
  issue_date: string; due_date: string;
  status: "draft" | "sent" | "paid" | "overdue";
  subtotal: number; tax_rate: number; tax_amount: number; total: number; notes: string | null;
};

function InvoicesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Invoice | null>(null);

  const { data: invoices = [] } = useQuery({
    queryKey: ["invoices", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("invoices").select("*").order("issue_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((i: any) => ({
        ...i,
        subtotal: Number(i.subtotal), tax_rate: Number(i.tax_rate),
        tax_amount: Number(i.tax_amount), total: Number(i.total),
      })) as Invoice[];
    },
  });

  const create = useMutation({
    mutationFn: async ({ inv, items }: { inv: Partial<Invoice>; items: Item[] }) => {
      const { data, error } = await supabase.from("invoices").insert({
        user_id: user?.id,
        invoice_number: inv.invoice_number!, client_name: inv.client_name!,
        client_email: inv.client_email, issue_date: inv.issue_date!, due_date: inv.due_date!,
        status: inv.status ?? "draft", subtotal: inv.subtotal!, tax_rate: inv.tax_rate!,
        tax_amount: inv.tax_amount!, total: inv.total!, notes: inv.notes,
      }).select().single();
      if (error) throw error;
      const itemRows = items.map((it, i) => ({
        invoice_id: data.id, description: it.description, quantity: it.quantity,
        unit_price: it.unit_price, amount: it.amount, position: i,
      }));
      const { error: iErr } = await supabase.from("invoice_items").insert(itemRows);
      if (iErr) throw iErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      setOpen(false); toast.success("Invoice created");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").update({ status: "paid" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Marked as paid"); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invoices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast.success("Deleted"); },
  });

  const downloadPDF = async (inv: Invoice) => {
    const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", inv.id).order("position");
    const doc = new jsPDF();
    doc.setFontSize(20); doc.setTextColor(15, 23, 42);
    doc.text("INVOICE", 14, 20);
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Invoice #: ${inv.invoice_number}`, 14, 30);
    doc.text(`Issue date: ${formatDate(inv.issue_date)}`, 14, 36);
    doc.text(`Due date: ${formatDate(inv.due_date)}`, 14, 42);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12); doc.text("Bill to:", 14, 56);
    doc.setFontSize(11); doc.text(inv.client_name, 14, 63);
    if (inv.client_email) doc.text(inv.client_email, 14, 69);
    autoTable(doc, {
      startY: 80,
      head: [["Description", "Qty", "Unit price", "Amount"]],
      body: (items ?? []).map((it: any) => [
        it.description, String(it.quantity),
        formatUSD(Number(it.unit_price)), formatUSD(Number(it.amount)),
      ]),
      headStyles: { fillColor: [15, 23, 42] },
    });
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.text(`Subtotal: ${formatUSD(inv.subtotal)}`, 140, finalY);
    doc.text(`Tax (${inv.tax_rate}%): ${formatUSD(inv.tax_amount)}`, 140, finalY + 6);
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text(`Total: ${formatUSD(inv.total)}`, 140, finalY + 14);
    doc.save(`${inv.invoice_number}.pdf`);
  };

  return (
    <AppShell title={t("pages.invoices.title")}>
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <p className="text-muted-foreground">{invoices.length} invoices</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            const csv = toCSV(invoices, [
              { key: "invoice_number", header: "Invoice #" },
              { key: "client_name", header: "Client" },
              { key: "client_email", header: "Email" },
              { key: "issue_date", header: "Issue Date" },
              { key: "due_date", header: "Due Date" },
              { key: "subtotal", header: "Subtotal" },
              { key: "tax_amount", header: "Tax" },
              { key: "total", header: "Total" },
              { key: "status", header: "Status" },
            ]);
            downloadCSV(`invoices-${new Date().toISOString().slice(0,10)}.csv`, csv);
          }}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" /> New Invoice</Button></DialogTrigger>
            <InvoiceFormDialog
              nextNumber={`INV-${String(invoices.length + 1).padStart(3, "0")}`}
              onSubmit={(inv, items) => create.mutate({ inv, items })}
              busy={create.isPending}
            />
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Issue</TableHead>
                <TableHead className="hidden md:table-cell">Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((i) => {
                const pred = predictPayment(i, invoices);
                return <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.invoice_number}</TableCell>
                  <TableCell>{i.client_name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(i.issue_date)}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(i.due_date)}</TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatUSD(i.total)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 items-start">
                      <StatusBadge value={i.status} />
                      {pred && <PaymentTag label={pred.label} tone={pred.tone} />}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" title="Preview" onClick={() => setPreview(i)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Download PDF" onClick={() => downloadPDF(i)}><Download className="h-4 w-4" /></Button>
                      {i.status !== "paid" && (
                        <Button variant="ghost" size="icon" title="Mark paid" onClick={() => markPaid.mutate(i.id)}><Check className="h-4 w-4" /></Button>
                      )}
                      <Button variant="ghost" size="icon" title="Delete" onClick={() => remove.mutate(i.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>;
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-2xl">
          {preview && <InvoicePreview invoice={preview} onDownload={() => downloadPDF(preview)} />}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function InvoicePreview({ invoice, onDownload }: { invoice: Invoice; onDownload: () => void }) {
  const { data: items = [] } = useQuery({
    queryKey: ["invoice_items", invoice.id],
    enabled: !!invoice.id,
    queryFn: async () => {
      const { data } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoice.id).order("position");
      return (data ?? []).map((it: any) => ({ ...it, quantity: Number(it.quantity), unit_price: Number(it.unit_price), amount: Number(it.amount) }));
    },
  });
  return (
    <div>
      <DialogHeader><DialogTitle>Invoice {invoice.invoice_number}</DialogTitle></DialogHeader>
      <div className="border rounded-md p-6 mt-4 bg-card">
        <div className="flex justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-primary">INVOICE</h2>
            <p className="text-sm text-muted-foreground mt-1">{invoice.invoice_number}</p>
          </div>
          <StatusBadge value={invoice.status} />
        </div>
        <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
          <div>
            <div className="text-xs uppercase text-muted-foreground mb-1">Bill to</div>
            <div className="font-semibold">{invoice.client_name}</div>
            <div className="text-muted-foreground">{invoice.client_email}</div>
          </div>
          <div className="text-right">
            <div><span className="text-muted-foreground">Issue: </span>{formatDate(invoice.issue_date)}</div>
            <div><span className="text-muted-foreground">Due: </span>{formatDate(invoice.due_date)}</div>
          </div>
        </div>
        <table className="w-full text-sm border-t border-b">
          <thead className="text-left">
            <tr className="border-b">
              <th className="py-2">Description</th>
              <th className="py-2 text-right">Qty</th>
              <th className="py-2 text-right">Unit price</th>
              <th className="py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any) => (
              <tr key={it.id} className="border-b last:border-0">
                <td className="py-2">{it.description}</td>
                <td className="py-2 text-right">{it.quantity}</td>
                <td className="py-2 text-right tabular-nums">{formatUSD(it.unit_price)}</td>
                <td className="py-2 text-right tabular-nums">{formatUSD(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mt-4">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatUSD(invoice.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax ({invoice.tax_rate}%)</span><span className="tabular-nums">{formatUSD(invoice.tax_amount)}</span></div>
            <div className="flex justify-between border-t pt-2 font-bold text-base"><span>Total</span><span className="tabular-nums text-primary">{formatUSD(invoice.total)}</span></div>
          </div>
        </div>
      </div>
      <DialogFooter className="mt-4">
        <Button onClick={onDownload}><Download className="h-4 w-4 mr-1" /> Download PDF</Button>
      </DialogFooter>
    </div>
  );
}

function InvoiceFormDialog({
  nextNumber, onSubmit, busy,
}: { nextNumber: string; onSubmit: (inv: Partial<Invoice>, items: Item[]) => void; busy: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
  const [inv, setInv] = useState<Partial<Invoice>>({
    invoice_number: nextNumber, client_name: "", client_email: "",
    issue_date: today, due_date: due, status: "draft", tax_rate: 10,
  });
  const [items, setItems] = useState<Item[]>([
    { description: "", quantity: 1, unit_price: 0, amount: 0, position: 0 },
  ]);

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const taxAmount = subtotal * ((inv.tax_rate ?? 0) / 100);
  const total = subtotal + taxAmount;

  const updateItem = (i: number, patch: Partial<Item>) => {
    setItems(items.map((it, idx) => {
      if (idx !== i) return it;
      const n = { ...it, ...patch };
      n.amount = n.quantity * n.unit_price;
      return n;
    }));
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader><DialogTitle>New invoice</DialogTitle></DialogHeader>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Invoice #</Label><Input value={inv.invoice_number ?? ""} onChange={(e) => setInv({ ...inv, invoice_number: e.target.value })} /></div>
          <div>
            <Label>Status</Label>
            <Select value={inv.status} onValueChange={(v) => setInv({ ...inv, status: v as any })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Client name *</Label><Input value={inv.client_name ?? ""} onChange={(e) => setInv({ ...inv, client_name: e.target.value })} /></div>
          <div><Label>Client email</Label><Input type="email" value={inv.client_email ?? ""} onChange={(e) => setInv({ ...inv, client_email: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><Label>Issue date</Label><Input type="date" value={inv.issue_date ?? ""} onChange={(e) => setInv({ ...inv, issue_date: e.target.value })} /></div>
          <div><Label>Due date</Label><Input type="date" value={inv.due_date ?? ""} onChange={(e) => setInv({ ...inv, due_date: e.target.value })} /></div>
          <div><Label>Tax rate (%)</Label><Input type="number" value={inv.tax_rate ?? 0} onChange={(e) => setInv({ ...inv, tax_rate: Number(e.target.value) })} /></div>
        </div>

        <div>
          <Label>Line items</Label>
          <div className="space-y-2 mt-2">
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input className="col-span-6" placeholder="Description" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                <Input className="col-span-2" type="number" placeholder="Qty" value={it.quantity} onChange={(e) => updateItem(i, { quantity: Number(e.target.value) })} />
                <Input className="col-span-2" type="number" placeholder="Price" value={it.unit_price} onChange={(e) => updateItem(i, { unit_price: Number(e.target.value) })} />
                <div className="col-span-1 text-right text-sm tabular-nums">{formatUSD(it.amount)}</div>
                <Button variant="ghost" size="icon" className="col-span-1" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => setItems([...items, { description: "", quantity: 1, unit_price: 0, amount: 0, position: items.length }])}>
            <Plus className="h-3 w-3 mr-1" /> Add item
          </Button>
        </div>

        <div className="flex justify-end pt-3 border-t">
          <div className="w-56 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatUSD(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{formatUSD(taxAmount)}</span></div>
            <div className="flex justify-between font-bold border-t pt-1"><span>Total</span><span className="tabular-nums text-primary">{formatUSD(total)}</span></div>
          </div>
        </div>
      </div>
      <DialogFooter>
        <Button
          disabled={busy || !inv.client_name || !inv.invoice_number}
          onClick={() => onSubmit({ ...inv, subtotal, tax_amount: taxAmount, total }, items)}
        >Create invoice</Button>
      </DialogFooter>
    </DialogContent>
  );
}
