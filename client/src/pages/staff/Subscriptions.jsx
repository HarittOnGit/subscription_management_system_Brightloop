import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Copy } from 'lucide-react';
import { api } from '../../api/client';
import Table from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import FormField, { inputClass } from '../../components/FormField';

export default function Subscriptions() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], page: 1, pages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Template modal state
  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tplForm, setTplForm] = useState({
    templateId: '',
    customerId: '',
    startDate: new Date().toISOString().slice(0, 10),
    paymentTerms: 'NET_30',
  });
  const [modalError, setModalError] = useState('');

  const load = () => {
    const params = new URLSearchParams({ page });
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    api(`/subscriptions?${params.toString()}`)
      .then(setData)
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    load();
  }, [page, search, status]);

  const openTemplateModal = async () => {
    try {
      const [tplRes, custRes] = await Promise.all([
        api('/templates?limit=100'),
        api('/users?role=CUSTOMER&limit=100').catch(() => ({ items: [] })),
      ]);
      setTemplates(tplRes.items || []);
      const custList = custRes.items || [
        { id: 'fake-1', name: 'Demo Customer 1' },
        { id: 'fake-2', name: 'Demo Customer 2' },
      ];
      setCustomers(custList);
      setTplForm({
        templateId: tplRes.items?.[0]?.id || '',
        customerId: custList[0]?.id || '',
        startDate: new Date().toISOString().slice(0, 10),
        paymentTerms: 'NET_30',
      });
      setTplModalOpen(true);
    } catch (e) {
      alert(e.message);
    }
  };

  const submitFromTemplate = async (e) => {
    e.preventDefault();
    setModalError('');
    if (!tplForm.templateId) return setModalError('Please pick a quotation template');
    if (!tplForm.customerId) return setModalError('Please select a customer');

    try {
      const sub = await api(`/subscriptions/from-template/${tplForm.templateId}`, {
        method: 'POST',
        body: {
          customerId: tplForm.customerId,
          startDate: tplForm.startDate,
          paymentTerms: tplForm.paymentTerms,
        },
      });
      setTplModalOpen(false);
      navigate(`/subscriptions/${sub.id}`);
    } catch (err) {
      setModalError(err.message);
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Subscriptions</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className={inputClass}
            placeholder="Search number or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <select
            className={inputClass}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="QUOTATION">Quotation</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="ACTIVE">Active</option>
            <option value="CLOSED">Closed</option>
          </select>
          <button
            onClick={openTemplateModal}
            className="flex items-center gap-1 rounded-lg border border-indigo-600 bg-white px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 cursor-pointer"
          >
            <Copy size={16} /> From template
          </button>
          <Link
            to="/subscriptions/new"
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 cursor-pointer"
          >
            <Plus size={16} /> New subscription
          </Link>
        </div>
      </div>

      <Table
        page={data.page}
        pages={data.pages}
        onPage={setPage}
        rows={data.items}
        columns={[
          {
            label: 'Number',
            render: (r) => (
              <Link to={`/subscriptions/${r.id}`} className="font-semibold text-indigo-600 hover:underline">
                {r.number}
              </Link>
            ),
          },
          { label: 'Customer', render: (r) => r.customer?.name || r.customerId },
          { label: 'Plan', render: (r) => r.plan?.name || r.planId },
          { label: 'Start Date', render: (r) => r.startDate?.slice(0, 10) },
          { label: 'Expiry Date', render: (r) => r.expiryDate?.slice(0, 10) },
          { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          {
            label: '',
            render: (r) => (
              <Link to={`/subscriptions/${r.id}`} className="text-sm font-medium text-indigo-600 hover:underline">
                View &rarr;
              </Link>
            ),
          },
        ]}
      />

      <Modal open={tplModalOpen} title="New Subscription from Template" onClose={() => setTplModalOpen(false)}>
        <form onSubmit={submitFromTemplate} className="space-y-4">
          <FormField label="Template">
            <select
              className={inputClass}
              required
              value={tplForm.templateId}
              onChange={(e) => setTplForm({ ...tplForm, templateId: e.target.value })}
            >
              <option value="">Select a template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.plan?.name})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Customer">
            <select
              className={inputClass}
              required
              value={tplForm.customerId}
              onChange={(e) => setTplForm({ ...tplForm, customerId: e.target.value })}
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Start Date">
            <input
              type="date"
              className={inputClass}
              required
              value={tplForm.startDate}
              onChange={(e) => setTplForm({ ...tplForm, startDate: e.target.value })}
            />
          </FormField>

          <FormField label="Payment Terms">
            <select
              className={inputClass}
              value={tplForm.paymentTerms}
              onChange={(e) => setTplForm({ ...tplForm, paymentTerms: e.target.value })}
            >
              <option value="IMMEDIATE">Immediate</option>
              <option value="NET_15">Net 15</option>
              <option value="NET_30">Net 30</option>
              <option value="NET_60">Net 60</option>
            </select>
          </FormField>

          {modalError && <p className="text-sm text-red-600">{modalError}</p>}

          <button className="w-full rounded-lg bg-indigo-600 py-2 text-white font-medium hover:bg-indigo-700 cursor-pointer">
            Create Subscription
          </button>
        </form>
      </Modal>
    </div>
  );
}
