export const SAMPLE_SI_TEXT = `
SHIPPING INSTRUCTION

Shipper: Arvind Textiles Pvt Ltd
Address: Plot 45, GIDC Industrial Estate, Surat, Gujarat 395010, India

Consignee: Zara International BV
Address: Calle Industria 55, Amsterdam 1012, Netherlands

Notify Party: Same as Consignee

Port of Loading: INNSA - Nhava Sheva, India
Port of Discharge: NLRTM - Rotterdam, Netherlands
Place of Delivery: Amsterdam

Cargo Description: 100% Cotton Denim Fabric
HS Code: 52094200
Gross Weight: 14,500 KGS
Net Weight: 13,800 KGS
Number of Packages: 240
Package Type: Rolls
Marks & Numbers: ARV/ZAR/2024/001-240

Freight Terms: Prepaid

Special Instructions: Handle with care. Keep dry.
`;

export const SAMPLE_BOOKING_CONFIRMATION_TEXT = `
BOOKING CONFIRMATION

Booking Reference: MAEU-123456
Shipping Line: Maersk Line

Vessel: Maersk Elba
Voyage: 401W

Port of Loading: INNSA (Nhava Sheva, India)
Port of Discharge: NLRTM (Rotterdam, Netherlands)

Container Type: 40HC
Number of Containers: 2

Sailing Date: 25 January 2024
Cut-off Date: 22 January 2024 18:00

Shipper Reference: ARV-2024-Q1
`;

export const SAMPLE_CI_TEXT = `
COMMERCIAL INVOICE

Invoice Number: ARV-2024-089
Invoice Date: 14 January 2024

Seller / Shipper:
Arvind Textiles Pvt Ltd
Plot 45, GIDC Estate, Surat, Gujarat 395010

Buyer / Consignee:
Zara International BV
Calle Industria 55, Amsterdam 1012, Netherlands

Description of Goods: 100% Cotton Denim Fabric
HS Code: 52094200

Quantity: 240 Rolls
Unit Price: USD 187.50 per Roll
Total Value: USD 45,000.00
Currency: USD

Incoterms: FOB Nhava Sheva
Country of Origin: India

Bank Details: HDFC Bank, Surat Branch
`;

export const SAMPLE_PL_TEXT = `
PACKING LIST

Packing List Reference: ARV-PL-2024-089
Date: 14 January 2024

Shipper: Arvind Textiles Pvt Ltd
Consignee: Zara International BV

Total Number of Packages: 240 Rolls
Package Type: Rolls

Total Gross Weight: 14,500 KGS
Total Net Weight: 13,800 KGS

Dimensions per Roll: 120cm x 30cm x 30cm

Marks & Numbers: ARV/ZAR/2024/001-240

Contents: 100% Cotton Denim Fabric, 100m per roll
`;

export const SAMPLE_DOCUMENTS = [
  SAMPLE_SI_TEXT,
  SAMPLE_BOOKING_CONFIRMATION_TEXT,
  SAMPLE_CI_TEXT,
  SAMPLE_PL_TEXT
];
