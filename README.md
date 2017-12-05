# Node TLS crash demo

## Repro:

* Checkout
* `npm install`
* `npm start`
* Start chrome using this as a proxy
* Node will segfault with a minute or two

This module is a minimal POC implementation of an HTTPS intercepting proxy. It's using no native modules at all, but it still reliably
crashes with SIGSEGV/SIGABRT in recent Node versions.

## Details

Running `npm start` starts an intercepting HTTPS proxy server on port 8000. You'll need to disable cert validation or trust `test-ca.pem` as a CA to use it.

E.g. with curl:

```bash
curl -k --proxy-insecure -x https://localhost:8000 https://example.com
```

You can start a fresh Chrome session using this proxy & trusting the cert with:

```
google-chrome --user-data-dir=/tmp/chrome --proxy-server="https://localhost:8000" --ignore-certificate-errors-spki-list=AvVrqB/anBbJ+KRCMH/anWgZbeE0Y28JtqYB0+2MDmE=
```

After a minute of heavy use the proxy will crash with SIGSEGV/SIGABRT, I think always in CRYPTO_free, and typically inside DestroySSL.

The easiest repro for me is just to open `https://cnn.com` in a few tabs. This fails in at least Node 8.9.1 and 6.12.0 (though v6 seems to take longer).

Note that this code doesn't use any native modules - it's pure JS all the way down (according to `find node_modules/ -name \*.node`), so this
is a crash coming directly from Node itself.

Failures typically look something like:

```
*** Error in `node': free(): invalid next size (fast): 0x0000000003ea2660 ***
======= Backtrace: =========
/lib/x86_64-linux-gnu/libc.so.6(+0x7908b)[0x7f3ba3ff908b]
/lib/x86_64-linux-gnu/libc.so.6(+0x82c3a)[0x7f3ba4002c3a]
/lib/x86_64-linux-gnu/libc.so.6(cfree+0x4c)[0x7f3ba4006d2c]
node(CRYPTO_free+0x25)[0x997995]
node(ASN1_primitive_free+0x6f)[0x90ed0f]
node(asn1_item_combine_free+0x93)[0x90eea3]
node(ASN1_item_free+0x2b2)[0x90f502]
node(sk_pop_free+0x37)[0x9d2767]
node[0x913a3d]
node(asn1_item_combine_free+0x5e)[0x90ee6e]
node(asn1_item_combine_free+0x2e2)[0x90f0f2]
node(ASN1_item_free+0x2b2)[0x90f502]
node(sk_pop_free+0x37)[0x9d2767]
node(ssl_sess_cert_free+0x53)[0x8d3793]
node(SSL_SESSION_free+0x8f)[0x8e0fcf]
node(SSL_free+0xf5)[0x8db195]
node(_ZN4node6crypto7SSLWrapINS_7TLSWrapEE10DestroySSLEv+0x1a)[0x12dd7ea]
node(_ZN4node7TLSWrap10DestroySSLERKN2v820FunctionCallbackInfoINS1_5ValueEEE+0xb8)[0x12e33b8]
node(_ZN2v88internal25FunctionCallbackArguments4CallEPFvRKNS_20FunctionCallbackInfoINS_5ValueEEEE+0x193)[0xb1a073]
node[0xb8fe3c]
node(_ZN2v88internal21Builtin_HandleApiCallEiPPNS0_6ObjectEPNS0_7IsolateE+0xaf)[0xb90a8f]
[0x15bab148463d]
```

```
*** Error in `node': free(): invalid pointer: 0x0000000002ff6580 ***
======= Backtrace: =========
/lib/x86_64-linux-gnu/libc.so.6(+0x7908b)[0x7f78f945b08b]
/lib/x86_64-linux-gnu/libc.so.6(+0x82c3a)[0x7f78f9464c3a]
/lib/x86_64-linux-gnu/libc.so.6(cfree+0x4c)[0x7f78f9468d2c]
node(CRYPTO_free+0x25)[0x997995]
node(sk_free+0x1f)[0x9d27df]
node(asn1_item_combine_free+0x1f4)[0x90f004]
node(ASN1_item_free+0x2b2)[0x90f502]
node(_ZN4node6crypto13SecureContextD0Ev+0x3f)[0x12d76ef]
node(_ZN2v88internal13GlobalHandles31DispatchPendingPhantomCallbacksEb+0xee)[0xe7b01e]
node(_ZN2v88internal13GlobalHandles31PostGarbageCollectionProcessingENS0_16GarbageCollectorENS_15GCCallbackFlagsE+0x2a)[0xe7b28a]
node(_ZN2v88internal4Heap24PerformGarbageCollectionENS0_16GarbageCollectorENS_15GCCallbackFlagsE+0x2be)[0xea660e]
node[0xea7933]
node(_ZN2v88internal4Heap36FinalizeIncrementalMarkingIfCompleteENS0_23GarbageCollectionReasonE+0x4a)[0xea86ca]
node(_ZN2v88internal21IncrementalMarkingJob4Task11RunInternalEv+0x119)[0xeaa0d9]
node(_ZN2v88internal14CancelableTask3RunEv+0x36)[0xbc83e6]
node(_ZN4node12NodePlatform28FlushForegroundTasksInternalEv+0x1f4)[0x1272174]
node[0x145796b]
node[0x14694c8]
node(uv_run+0x156)[0x14582f6]
node(_ZN4node5StartEP9uv_loop_siPKPKciS5_+0xc75)[0x122af15]
node(_ZN4node5StartEiPPc+0x163)[0x1223b73]
/lib/x86_64-linux-gnu/libc.so.6(__libc_start_main+0xf1)[0x7f78f94023f1]
node[0x8ae7c1]
```

```
*** Error in `node': corrupted size vs. prev_size: 0x0000000003fd6060 ***
======= Backtrace: =========
/lib/x86_64-linux-gnu/libc.so.6(+0x7908b)[0x7f66633b608b]
/lib/x86_64-linux-gnu/libc.so.6(+0x814a7)[0x7f66633be4a7]
/lib/x86_64-linux-gnu/libc.so.6(+0x82f20)[0x7f66633bff20]
/lib/x86_64-linux-gnu/libc.so.6(cfree+0x4c)[0x7f66633c3d2c]
node(CRYPTO_free+0x25)[0x997995]
node(SSL_CTX_free+0x1e3)[0x8da9b3]
node(_ZN4node6crypto13SecureContextD0Ev+0x31)[0x12d76e1]
node(_ZN2v88internal13GlobalHandles31DispatchPendingPhantomCallbacksEb+0xee)[0xe7b01e]
node(_ZN2v88internal13GlobalHandles31PostGarbageCollectionProcessingENS0_16GarbageCollectorENS_15GCCallbackFlagsE+0x2a)[0xe7b28a]
node(_ZN2v88internal4Heap24PerformGarbageCollectionENS0_16GarbageCollectorENS_15GCCallbackFlagsE+0x2be)[0xea660e]
node[0xea7933]
node(_ZN2v88internal4Heap36FinalizeIncrementalMarkingIfCompleteENS0_23GarbageCollectionReasonE+0x4a)[0xea86ca]
node(_ZN2v88internal21IncrementalMarkingJob4Task11RunInternalEv+0x119)[0xeaa0d9]
node(_ZN2v88internal14CancelableTask3RunEv+0x36)[0xbc83e6]
node(_ZN4node12NodePlatform28FlushForegroundTasksInternalEv+0x1f4)[0x1272174]
node[0x145796b]
node[0x14694c8]
node(uv_run+0x156)[0x14582f6]
node(_ZN4node5StartEP9uv_loop_siPKPKciS5_+0xc75)[0x122af15]
node(_ZN4node5StartEiPPc+0x163)[0x1223b73]
/lib/x86_64-linux-gnu/libc.so.6(__libc_start_main+0xf1)[0x7f666335d3f1]
node[0x8ae7c1]
```