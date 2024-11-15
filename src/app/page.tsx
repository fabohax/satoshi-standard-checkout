'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useNostr, useSubscription, useZap } from '@lawallet/react';
import { Event } from 'nostr-tools';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Navbar } from '@/components/navbar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { cn } from '@/lib/utils';

// Generic
import { FormCustomer } from '../features/form-customer';
import { FormPayment } from '../features/form-payment';
import { Order, OrderRequest, OrderUserData } from '@/types/orders';

// Icons
import { SleepingIcon } from '@/components/icons/SleepingIcon';
import { CreditCardValidationIcon } from '@/components/icons/CreditCardValidationIcon';
import { PlusIcon } from '@/components/icons/PlusIcon';
import { MinusIcon } from '@/components/icons/MinusIcon';

import useOrder from '@/hooks/useOrder';
import { convertEvent } from '../lib/utils/nostr';
import { set } from 'zod';

// Constants for clarity and reusability
const SATOSHI_UNIT = 100_000_000;
const VALUE_TYPE = 'SAT';

const TICKET = {
  title: 'Cowork de La Crypta',
  description: 'De 10:00hs a 20:00hs en la casa de La Crypta',
  imageUrl: 'https://placehold.co/400',
  value: parseInt(process.env.TICKET_PRICE!) * SATOSHI_UNIT, // Ensures value is in satoshis
  valueType: VALUE_TYPE,
};

// Encapsulate the calculation in a reusable function
const calculateTicketTotal = (qty: number, unitValue: number) => qty * unitValue;

export default function Page() {
  // State hooks
  const [screen, setScreen] = useState<string>('information');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [alertText, setAlertText] = useState<string>('Try again.');

  const [ticketsQty, setTicketsQty] = useState<number>(1);
  const [ticketsValue, setTicketsValue] = useState<number>(calculateTicketTotal(1, TICKET.value));
  

  // Dialog for reset invoice
  const [open, setOpen] = useState<boolean>(false);


  // Claim invoice
  const [newEvent, setNewEvent] = useState<Event | undefined>(undefined);
  const [userData, setUserData] = useState<OrderUserData | undefined>(
    undefined
  );

  // Function to handle user input and multiply qty
  const handleUserQtyInput = (userQty: number) => {
    setTicketsQty(1 * userQty); // Adjust multiplier as needed
  };

  // Hooks
  const {
    orderReferenceId,
    
    paymentRequest,
    isPaid,
    requestNewOrder,
    claimOrderPayment,
    setOrderReferenceId,
    
    setPaymentRequest,
    setIsPaid,
    clear,
  } = useOrder();

  const { events } = useSubscription({
    filters: [{ kinds: [9735], '#e': [orderReferenceId!] }],
    options: { closeOnEose: false },
    enabled: Boolean(orderReferenceId),
  });

  // Process payment
  useEffect(() => {
    const processPayment = async () => {
      try {
        const event: Event = convertEvent(events[0]);

        if (!event) {
          console.warn('Event not defined ');
          return;
        }

        if (!userData) {
          console.warn('User data not defined ');
          return;
        }

        await claimOrderPayment(userData, event);

        setUserData(undefined);
        setNewEvent(undefined);
        setIsPaid(true);
      } catch (error: any) {
        setOpen(true);
        setAlertText(error.message);
      }
    };

    events && events.length > 0 && processPayment();
  }, [events]);


    // Memoized handler to avoid unnecessary re-renders
    const handleCreateOrder = useCallback(async (data: OrderUserData) => {
      if (isLoading) return;
  
      setIsLoading(true);
      try {
        const order = await requestNewOrder({ ...data, qty: ticketsQty });
        setPaymentRequest(order.pr);
        setOrderReferenceId(order.orderReferenceId);
  
        setTicketsValue(calculateTicketTotal(ticketsQty, TICKET.value)); // Update value with qty
        setScreen('payment');
        setUserData(data);
      } catch (error: any) {
        setAlertText(error.message);
        setOpen(true);
      } finally {
        setIsLoading(false);
      }
    }, [isLoading, ticketsQty, requestNewOrder]);

  // UI Button "Back to page"
  const backToPage = useCallback(() => {
    setScreen('information');
    setOrderReferenceId(undefined);
    setTicketsQty(1);
    setPaymentRequest(undefined);
    setIsPaid(false);
  }, [setOrderReferenceId, setTicketsQty, setPaymentRequest, setIsPaid]);

  // Calculate ticket price
  useEffect(() => {
  
    const calculateValue = async () => {
      try {
        const total = Math.round(
          (await ticketsQty * TICKET.value)
        );

        setTicketsValue(total);
      } catch (error: any) {
        console.error('Error calculating ticket price:', error);
      }
    };

    calculateValue();
  }, [ticketsQty]);

  useEffect(() => {
    if (isPaid) {
      setScreen('summary');
    }
  }, [isPaid]);

  useEffect(() => {
    setIsLoading(false);
  }, []);

  // if (isLoading) {
  //   return (
  //     <>
  //       <p>Cargando...</p>
  //     </>
  //   );
  // }

  return (
    <>
      <div className="flex flex-col md:flex-row w-full min-h-[100dvh]">
        {/* Aside info */}
        <aside className="bg-card relative flex justify-center items-center w-full min-h-full pt-[60px] md:pt-0">
          <Navbar />
          <div
            className={cn(
              'w-full max-w-[520px]  px-4',
              screen === 'information' ? 'my-4' : ''
            )}
          >
            {screen === 'information' ? (
              <>
                <Card className="p-4 bg-background">
                  <div className="flex justify-between items-center gap-4">
                    <div>
                      <h2 className="text-md">{TICKET.title}</h2>
                      <p className="font-semibold text-lg">
                        {TICKET.value} {' SAT'}
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <Button
                        variant={
                          screen !== 'information' || ticketsQty === 1
                            ? 'ghost'
                            : 'secondary'
                        }
                        size="icon"
                        onClick={() => setTicketsQty(ticketsQty - 1)}
                        disabled={screen !== 'information' || ticketsQty === 1}
                      >
                        <MinusIcon />
                      </Button>
                      <p className="flex items-center justify-center gap-1 w-[40px] font-semibold">
                        {screen !== 'information' && (
                          <span className="font-normal text-xs text-text">
                            x
                          </span>
                        )}
                        {ticketsQty}
                      </p>
                      <Button
                        variant={
                          screen !== 'information' ? 'ghost' : 'secondary'
                        }
                        size="icon"
                        onClick={() => setTicketsQty(ticketsQty + 1)}
                        disabled={screen !== 'information'}
                      >
                        <PlusIcon />
                      </Button>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-text">{TICKET.description}</p>
                </Card>

                <div className="p-4">
                  <div className="flex gap-4 justify-between items-center">
                    <p className="text-text">Total</p>
                    <p className="font-bold text-md">
                      {ticketsValue
                        ? ticketsValue + ' ' + 'SAT'
                        : 'Calculating...'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Accordion
                  type="single"
                  collapsible
                  className="w-full md:hidden"
                >
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="flex gap-2 no-underline">
                      <div className="flex items-center justify-between gap-2 w-full">
                        Show order summary
                        <p className="font-bold text-lg no-underline">
                          {ticketsValue
                            ? ticketsValue + ' ' + 'SAT'
                            : 'Calculating...'}
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card className="p-4 bg-background">
                        <div className="flex justify-between items-center gap-4">
                          <div>
                            <h2 className="text-md">{TICKET.title}</h2>
                            <p className="font-semibold text-lg">
                              {TICKET.value} {' SAT'}
                            </p>
                          </div>
                          <div className="flex gap-2 items-center">
                            <p className="flex items-center justify-center gap-1 w-[40px] font-semibold">
                              {screen !== 'information' && (
                                <span className="font-normal text-text">x</span>
                              )}
                              {ticketsQty}
                            </p>
                          </div>
                        </div>
                      </Card>
                      <div className="p-4">
                        <div className="flex gap-4 justify-between items-center">
                          <p className="text-text text-md">Total</p>
                          <p className="font-bold text-md">
                            {ticketsValue
                              ? ticketsValue + ' ' + TICKET.valueType
                              : 'Calculating...'}
                          </p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="hidden md:block ">
                  <Card className="p-4 bg-background">
                    <div className="flex justify-between items-center gap-4">
                      <div>
                        <h2 className="text-md">{TICKET.title}</h2>
                        <p className="font-semibold text-lg">
                          {TICKET.value} {' ARS'}
                        </p>
                      </div>
                      <div className="flex gap-2 items-center">
                        <p className="flex items-center justify-center gap-1 w-[40px] font-semibold">
                          {screen !== 'information' && (
                            <span className="font-normal text-text">x</span>
                          )}
                          {ticketsQty}
                        </p>
                      </div>
                    </div>
                  </Card>
                  <div className="p-4">
                    <div className="flex gap-4 justify-between items-center">
                      <p className="text-text">Total</p>
                      <p className="font-bold text-md">
                        {ticketsValue
                          ? ticketsValue + ' ' + TICKET.valueType
                          : 'Calculating...'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Section data */}
        <section className="relative flex flex-1 md:flex-auto w-full justify-center md:pr-4">
          <div className="flex flex-col gap-4 px-4 w-full py-4 max-w-[520px] pt-[80px]">
            <div className="absolute top-0 left-0 w-full h-[60px] flex justify-center items-center mx-auto  px-4 border-b-[1px] border-border">
              <div className="w-full max-w-[520px]">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbPage
                        className={cn(
                          '',
                          screen === 'information' ? 'text-white' : 'text-text'
                        )}
                      >
                        Information
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage
                        className={cn(
                          '',
                          screen === 'payment' ? 'text-white' : 'text-text'
                        )}
                      >
                        Payment
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage
                        className={cn(
                          '',
                          screen === 'summary' ? 'text-white' : 'text-text'
                        )}
                      >
                        Summary
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </div>

            {screen === 'information' && (
              <FormCustomer onSubmit={handleCreateOrder} />
            )}

            {screen === 'payment' && <FormPayment invoice={paymentRequest} />}

            {screen === 'summary' && (
              <>
                <Card>
                  <div className="flex-1 flex flex-col items-center justify-center gap-4 w-full mx-auto py-12 px-8">
                    <CreditCardValidationIcon className="w-8 h-8" />
                    <div className="flex flex-col gap-2 text-center">
                      <h2 className="font-bold text-2xl">Congratulation!</h2>
                      <p className="text-text">
                        Your payment has been confirmed. We have sent the event
                        details to your email.
                      </p>
                    </div>
                  </div>
                </Card>
                <Link href="/">
                  <Button
                    className="w-full"
                    variant="link"
                    onClick={backToPage}
                  >
                    Back to page
                  </Button>
                </Link>
              </>
            )}
          </div>
        </section>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader className="items-center">
            <SleepingIcon className="w-8 h-8 color-primary" />
            <AlertDialogTitle className="text-center">
              Oops! Try again
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              {alertText}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="flex-1 p-0" onClick={backToPage}>
              {/* <Button className="w-full" variant="secondary" tabIndex={-1}> */}
              Reload
              {/* </Button> */}
            </AlertDialogCancel>
            {/* <AlertDialogAction className="flex-1">Try again</AlertDialogAction> */}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
