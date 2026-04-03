export interface Profile {
    id: string;
    full_name: string;
    email: string;
    phone: string;
    role: 'admin' | 'operation_manager' | 'supervisor' | 'agent';
    status: 'active' | 'inactive';
    supervisor_id?: string | null;
    operation_manager_id?: string | null;
    push_token?: string | null;
    created_at: string;
    updated_at: string;
}

export interface Client {
    id: string;
    company_name: string;
    client_type: 'wholesaler' | 'retailer';
    contact_person: string;
    phone: string;
    address: string;
    notes?: string;
    assigned_agent_id: string;
    status: 'active' | 'inactive';
    latitude?: number | null;
    longitude?: number | null;
    photo_urls?: string[] | null;
    created_at: string;
    updated_at: string;
}

export interface WholesalerLocation {
    id: string;
    wholesaler_id: string;
    branch_name: string;
    address: string;
    latitude: number;
    longitude: number;
    is_primary: boolean;
    status: 'active' | 'inactive';
    created_at: string;
    updated_at: string;
}

export interface Product {
    id: string;
    product_name: string;
    category: string;
    unit_price: number;
    wholesaler_id: string;
    wholesaler_name: string;
    wholesaler_location_id?: string | null;
    commission_rate: number;
    stock_quantity?: number;
    distance_from_retailer?: number | null;
    created_at: string;
    updated_at: string;
}

export interface OrderItem {
    id: string;
    deal_id: string;
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    commission_rate: number;
    commission_amount: number;
    wholesaler_id?: string | null;
    wholesaler_name?: string | null;
    wholesaler_location_id?: string | null;
    created_at: string;
}

export interface Deal {
    id: string;
    deal_number: string;
    agent_id: string;
    retailer_id: string;
    retailer_name: string;
    product_name: string;
    wholesaler_id: string;
    wholesaler_name: string;
    quantity: number;
    deal_value: number;
    agent_commission: number;
    supervisor_commission?: number | null;
    operation_manager_commission?: number | null;
    supervisor_id?: string | null;
    operation_manager_id?: string | null;
    product_commission_rate: number;
    delivery_address: string;
    delivery_date: string;
    notes?: string;
    status: 'pending_admin' | 'pending_wholesaler' | 'confirmed' | 'delivered' | 'completed' | 'rejected';
    created_at: string;
    updated_at: string;
    delivered_at?: string | null;
    total_items: number;
    has_multiple_products: boolean;
}

export interface Commission {
    id: string;
    deal_id: string;
    agent_id: string;
    amount: number;
    status: 'pending' | 'paid';
    paid_at?: string | null;
    created_at: string;
}

export interface CommissionBreakdown {
    dealValue: number;
    commissionRate: number;
    totalCommission: number;
    agentBase: number;
    supervisorOverride: number;
    operationManagerOverride: number;
    finalEarnings: number;
}

export interface MonthlyTarget {
    id: string;
    agent_id: string;
    target_amount: number;
    month: string; // 'YYYY-MM'
    set_by: string;
    notes?: string | null;
    created_at: string;
}

export interface CartItem {
    product: Product;
    quantity: number;
    subtotal: number;
    commission: number;
    distance?: number;
}