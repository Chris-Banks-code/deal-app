export interface Profile {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: 'admin' | 'agent';
    status: 'active' | 'inactive';
    created_at: string;
}

export interface Client {
    id: string;
    company_name: string;
    client_type: 'wholesaler' | 'retailer';
    contact_person: string;
    phone: string;
    address?: string;
    assigned_agent_id: string;
    notes?: string;
    created_at: string;
}

export interface Deal {
    id: string;
    deal_number: string;
    wholesaler_id: string;
    retailer_id: string;
    agent_id: string;
    product_name: string;
    quantity: string;
    unit_price: number;
    deal_value: number;
    commission_amount: number;
    agent_commission: number;
    status: 'pending_admin' | 'pending_wholesaler' | 'confirmed' | 'rejected' | 'delivered' | 'completed';
    created_at: string;
}