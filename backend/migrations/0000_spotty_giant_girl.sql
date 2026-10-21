CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"action" text NOT NULL,
	"actor_id" text NOT NULL,
	"actor_name" text NOT NULL,
	"details_json" text,
	"ip_address" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dispensers" (
	"id" text PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"dispenser_number" integer NOT NULL,
	"island_number" integer NOT NULL,
	"brand" text NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" text PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"username" text,
	"password_hash" text,
	"reset_token" text,
	"reset_token_expiry" timestamp,
	"role" text NOT NULL,
	"phone" text NOT NULL,
	"shift_schedule" text DEFAULT 'MORNING' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"assigned_island" integer,
	"assigned_bunks" text,
	"custom_permissions" text,
	"last_login" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "eod_settlements" (
	"id" text PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"settlement_date" text NOT NULL,
	"timezone" text NOT NULL,
	"scheduled_close_time" text NOT NULL,
	"actual_close_timestamp" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'SETTLED' NOT NULL,
	"total_volume_sold" double precision NOT NULL,
	"total_gross_revenue" double precision NOT NULL,
	"total_cash" double precision NOT NULL,
	"total_digital" double precision NOT NULL,
	"total_credit" double precision NOT NULL,
	"actual_deposits" double precision NOT NULL,
	"settlement_difference" double precision NOT NULL,
	"is_auto_closed" boolean DEFAULT true NOT NULL,
	"closed_by" text NOT NULL,
	"auditor_notes" text
);
--> statement-breakpoint
CREATE TABLE "fuel_price_history" (
	"id" text PRIMARY KEY NOT NULL,
	"fuel_code" text NOT NULL,
	"station_id" text,
	"rate_per_liter" double precision NOT NULL,
	"effective_from" timestamp DEFAULT now() NOT NULL,
	"effective_until" timestamp,
	"remarks" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text NOT NULL,
	"created_by_name" text
);
--> statement-breakpoint
CREATE TABLE "fuels" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"rate_per_liter" double precision NOT NULL,
	"density_std_15c" double precision NOT NULL,
	"density_tolerance" double precision NOT NULL,
	"color" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "manual_meter_readings" (
	"id" text PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"nozzle_id" text NOT NULL,
	"fuel_code" text NOT NULL,
	"opening_meter" double precision NOT NULL,
	"closing_meter" double precision NOT NULL,
	"gross_dispensed_liters" double precision NOT NULL,
	"testing_liters" double precision DEFAULT 0 NOT NULL,
	"net_sold_liters" double precision NOT NULL,
	"fuel_rate" double precision NOT NULL,
	"net_sales_amount" double precision NOT NULL,
	"reading_type" text DEFAULT 'REGULAR_SHIFT' NOT NULL,
	"is_correction" boolean DEFAULT false NOT NULL,
	"correction_reason" text,
	"remarks" text,
	"entered_by" text NOT NULL,
	"reading_timestamp" timestamp DEFAULT now() NOT NULL,
	"shift_code" text,
	"recorded_by" text,
	"recorded_by_name" text
);
--> statement-breakpoint
CREATE TABLE "nozzles" (
	"id" text PRIMARY KEY NOT NULL,
	"dispenser_id" text NOT NULL,
	"station_id" text NOT NULL,
	"tank_id" text,
	"fuel_code" text NOT NULL,
	"nozzle_number" integer NOT NULL,
	"name" text,
	"device_identifier" text,
	"notes" text,
	"mechanical_totalizer" double precision DEFAULT 0 NOT NULL,
	"electronic_totalizer" double precision DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "number_sequences" (
	"prefix" text PRIMARY KEY NOT NULL,
	"current_value" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" text PRIMARY KEY NOT NULL,
	"role" text NOT NULL,
	"module" text NOT NULL,
	"can_create" boolean DEFAULT false NOT NULL,
	"can_read" boolean DEFAULT true NOT NULL,
	"can_update" boolean DEFAULT false NOT NULL,
	"can_delete" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shifts" (
	"id" text PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"shift_code" text NOT NULL,
	"attendant_id" text NOT NULL,
	"attendant_name" text NOT NULL,
	"island_number" integer NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"total_fuel_sold_liters" double precision DEFAULT 0 NOT NULL,
	"total_expected_revenue" double precision DEFAULT 0 NOT NULL,
	"cash_submitted" double precision DEFAULT 0 NOT NULL,
	"digital_submitted" double precision DEFAULT 0 NOT NULL,
	"credit_submitted" double precision DEFAULT 0 NOT NULL,
	"total_collected" double precision DEFAULT 0 NOT NULL,
	"shortage_excess" double precision DEFAULT 0 NOT NULL,
	"denominations_json" text,
	"notes" text,
	"manager_sign_off" text
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"location" text NOT NULL,
	"manager_id" text,
	"manager_name" text NOT NULL,
	"phone" text NOT NULL,
	"address" text,
	"city_state" text,
	"postal_code" text,
	"email" text,
	"latitude" double precision,
	"longitude" double precision,
	"notes" text,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"operating_hours" text DEFAULT '24_HOURS' NOT NULL,
	"eod_close_time" text DEFAULT '23:59' NOT NULL,
	"status" text DEFAULT 'ONLINE' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "stations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "tank_loads" (
	"id" text PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"tank_id" text NOT NULL,
	"fuel_code" text NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"invoice_no" text NOT NULL,
	"tanker_number" text NOT NULL,
	"invoice_volume_liters" double precision NOT NULL,
	"invoice_density" double precision NOT NULL,
	"observed_density" double precision NOT NULL,
	"observed_temp" double precision NOT NULL,
	"corrected_density_15c" double precision NOT NULL,
	"density_status" text NOT NULL,
	"dip_before_cm" double precision NOT NULL,
	"volume_before_liters" double precision NOT NULL,
	"dip_after_cm" double precision NOT NULL,
	"volume_after_liters" double precision NOT NULL,
	"received_volume_liters" double precision NOT NULL,
	"variance_liters" double precision NOT NULL,
	"variance_pct" double precision NOT NULL,
	"operator_name" text NOT NULL,
	"remarks" text
);
--> statement-breakpoint
CREATE TABLE "tanks" (
	"id" text PRIMARY KEY NOT NULL,
	"station_id" text NOT NULL,
	"tank_number" integer NOT NULL,
	"name" text,
	"fuel_code" text NOT NULL,
	"capacity_liters" double precision NOT NULL,
	"safe_capacity_liters" double precision NOT NULL,
	"current_dip_cm" double precision DEFAULT 0 NOT NULL,
	"current_volume_liters" double precision DEFAULT 0 NOT NULL,
	"opening_stock_liters" double precision DEFAULT 0 NOT NULL,
	"water_dip_cm" double precision DEFAULT 0.2 NOT NULL,
	"low_threshold_liters" double precision NOT NULL,
	"max_dip_cm" double precision DEFAULT 250 NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"location" text,
	"description" text,
	"last_dip_timestamp" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
