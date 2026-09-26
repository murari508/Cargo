"""Payment abstraction.

Nothing here ever touches a card number, CVV or UPI PIN - the provider's own
hosted checkout does that. We only create an order, and later verify a signed
receipt. Swapping in Razorpay or Stripe means writing one more Provider class.
"""
import hashlib
import hmac
import secrets
from abc import ABC, abstractmethod

from app.config import settings


class PaymentProvider(ABC):
    name = "abstract"

    @abstractmethod
    def create_order(self, amount: float, reference: str, method: str) -> dict:
        ...

    @abstractmethod
    def verify(self, order_id: str, checkout_token: str, signature: str) -> bool:
        ...


class MockProvider(PaymentProvider):
    """Development provider. Signs the order with the app secret so that a
    forged 'payment succeeded' call from the browser is rejected."""
    name = "mock"

    def create_order(self, amount: float, reference: str, method: str) -> dict:
        order_id = "order_" + secrets.token_hex(8)
        token = secrets.token_urlsafe(16)
        return {
            "order_id": order_id,
            "checkout_token": token,
            "amount": amount,
            "provider": self.name,
            "method": method,
            "signature": self._sign(order_id, token),
        }

    def _sign(self, order_id: str, token: str) -> str:
        return hmac.new(settings.secret_key.encode(),
                        f"{order_id}|{token}".encode(),
                        hashlib.sha256).hexdigest()

    def verify(self, order_id: str, checkout_token: str, signature: str) -> bool:
        return hmac.compare_digest(self._sign(order_id, checkout_token), signature)


class RazorpayProvider(PaymentProvider):
    name = "razorpay"

    def create_order(self, amount: float, reference: str, method: str) -> dict:
        raise NotImplementedError(
            "Add the razorpay SDK call here using settings.payment_key_id/secret"
        )

    def verify(self, order_id: str, checkout_token: str, signature: str) -> bool:
        raise NotImplementedError


_PROVIDERS = {"mock": MockProvider, "razorpay": RazorpayProvider}


def get_provider() -> PaymentProvider:
    return _PROVIDERS.get(settings.payment_provider, MockProvider)()
