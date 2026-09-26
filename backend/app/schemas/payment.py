from pydantic import BaseModel, Field


class PaymentCreate(BaseModel):
    booking_id: int
    method: str = Field(default="upi", description="upi | card | netbanking | wallet")


class PaymentCreated(BaseModel):
    order_id: str
    booking_reference: str
    amount: float
    currency: str = "INR"
    provider: str
    # the client uses this to render the mock checkout; no card data is ever posted
    checkout_token: str


class PaymentVerify(BaseModel):
    order_id: str
    checkout_token: str
    signature: str


class PaymentResult(BaseModel):
    success: bool
    booking_reference: str
    payment_status: str
    booking_status: str
    message: str
