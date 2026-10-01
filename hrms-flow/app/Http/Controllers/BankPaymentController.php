<?php

namespace App\Http\Controllers;

use App\Models\Plan;
use App\Models\User;
use App\Models\Setting;
use App\Models\PlanOrder;
use App\Models\PaymentSetting;
use Illuminate\Http\Request;

class BankPaymentController extends Controller
{
    public function processPayment(Request $request)
    {
        $validated = validatePaymentRequest($request, [
            'amount' => 'required|numeric|min:0',
            'receipt' => 'nullable|file|mimes:jpeg,jpg,png,pdf|max:5120',
        ]);

        try {
            $plan = Plan::findOrFail($validated['plan_id']);

            $orderData = [
                'user_id' => auth()->id(),
                'plan_id' => $plan->id,
                'billing_cycle' => $validated['billing_cycle'],
                'payment_method' => 'bank',
                'coupon_code' => $validated['coupon_code'] ?? null,
                'payment_id' => 'BANK_' . strtoupper(uniqid()),
                'status' => 'pending',
            ];

            // Handle receipt upload (skip in demo mode)
            if (!isDemo() && $request->hasFile('receipt')) {
                $extension = $request->file('receipt')->getClientOriginalExtension();
                $fileNameToStore = 'bank_receipt_' . time() . '.' . $extension;
                $upload = upload_file($request, 'receipt', $fileNameToStore, 'bank-receipts');

                if ($upload['status'] == true) {
                    $orderData['receipt'] = $upload['url'];
                }
            }

            createPlanOrder($orderData);

            return back()->with('success', __('Payment request submitted. Your plan will be activated after payment verification.'));

        } catch (\Exception $e) {
            return handlePaymentError($e, 'bank');
        }
    }
}