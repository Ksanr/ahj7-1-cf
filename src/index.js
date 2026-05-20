export default {
  async fetch(request, env, ctx) {
    // --- CORS -----
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    function addCORS(response) {
      const headers = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    // --- Получаем тикеты из KV ---
    // env.TICKETS_STORE — привязанное KV‑хранилище
    let tickets = [];
    try {
      const stored = await env.TICKETS_STORE.get('tickets');
      if (stored) {
        tickets = JSON.parse(stored);
      } else {
        // Если нет данных, создаём тестовые тикеты и сохраняем их
        tickets = [
          { id: 'd8c41c67-7e2e-4b00-b5c3-709120a1d58c', name: 'Поменять краску в принтере, ком. 404', description: 'Принтер HP LJ-1210, картриджи на складе', status: false, created: 1778898029887 },
          { id: '28e63a9f-5f0a-4a5c-8cd7-6f88ce59ed68', name: 'Переустановить Windows, PC-Hall24', description: '', status: false, created: 1778898029887 },
          { id: 'f9f1df2b-886c-4217-b268-fda722feb9cf', name: 'Установить обновление KB-31642dv3875', description: 'Вышло критическое обновление для Windows', status: false, created: 1778898029887 },
        ];
        await env.TICKETS_STORE.put('tickets', JSON.stringify(tickets));
      }
    } catch (err) {
      return addCORS(new Response(JSON.stringify({ error: 'KV access error' }), { status: 500, headers: { 'Content-Type': 'application/json' } }));
    }

    // Вспомогательная функция для ответа JSON
    function json(data, status = 200) {
      return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
    }

    // --- Разбор запроса ---
    const url = new URL(request.url);
    const method = url.searchParams.get('method');
    const id = url.searchParams.get('id');

    try {
      // GET-методы
      if (request.method === 'GET') {
        if (method === 'allTickets') {
          const list = tickets.map(({ description, ...rest }) => rest);
          return addCORS(json(list));
        }
        if (method === 'ticketById' && id) {
          const ticket = tickets.find(t => t.id === id);
          if (!ticket) return addCORS(json({ error: 'Ticket not found' }, 404));
          return addCORS(json(ticket));
        }
        if (method === 'deleteById' && id) {
          const index = tickets.findIndex(t => t.id === id);
          if (index === -1) return addCORS(json({ error: 'Ticket not found' }, 404));
          tickets.splice(index, 1);
          await env.TICKETS_STORE.put('tickets', JSON.stringify(tickets));
          return addCORS(new Response(null, { status: 204 }));
        }
      }

      // POST-методы
      if (request.method === 'POST') {
        if (method === 'createTicket') {
          const body = await request.json();
          const { name, description, status } = body;
          if (!name) return addCORS(json({ error: 'Name is required' }, 400));
          const newTicket = {
            id: crypto.randomUUID(),
            name,
            description: description || '',
            status: status || false,
            created: Date.now(),
          };
          tickets.push(newTicket);
          await env.TICKETS_STORE.put('tickets', JSON.stringify(tickets));
          const { description: _, ...rest } = newTicket;
          return addCORS(json(rest, 201));
        }
        if (method === 'updateById' && id) {
          const ticket = tickets.find(t => t.id === id);
          if (!ticket) return addCORS(json({ error: 'Ticket not found' }, 404));
          const { name, description, status } = await request.json();
          if (name !== undefined) ticket.name = name;
          if (description !== undefined) ticket.description = description;
          if (status !== undefined) ticket.status = status;
          await env.TICKETS_STORE.put('tickets', JSON.stringify(tickets));
          const { description: _, ...updated } = ticket;
          return addCORS(json(updated));
        }
      }

      return addCORS(json({ error: 'Invalid method' }, 400));
    } catch (err) {
      return addCORS(json({ error: err.message }, 500));
    }
  }
};
