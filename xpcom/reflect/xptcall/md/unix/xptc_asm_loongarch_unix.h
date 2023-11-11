#ifndef _XPTC_ASM_LOONGARCH_UNIX_H
#define _XPTC_ASM_LOONGARCH_UNIX_H


/*
 * Symbolic register names
 */
# define zero     $r0
# define ra       $r1
# define gp       $r2
# define sp       $r3
# define a0       $r4
# define v0       $r4
# define a1       $r5
# define v1       $r5
# define a2       $r6
# define a3       $r7
# define a4       $r8
# define a5       $r9
# define a6       $r10
# define a7       $r11
# define t0       $r12
# define t1       $r13
# define t2       $r14
# define t3       $r15
# define t4       $r16
# define t5       $r17
# define t6       $r18
# define t7       $r19
/* # define at       $r19 */
# define t8       $r20
# define tp       $r21
# define fp       $r22
# define s0       $r23
# define s1       $r24
# define s2       $r25
# define s3       $r26
# define s4       $r27
# define s5       $r28
# define s6       $r29
# define s7       $r30
# define s8       $r31
/* float point registers */
# define fa0      $f0
# define fv0      $f0
# define fa1      $f1
# define fv1      $f1
# define fa2      $f2
# define fa3      $f3
# define fa4      $f4
# define fa5      $f5
# define fa6      $f6
# define fa7      $f7
# define ft0      $f8
# define ft1      $f9
# define ft2      $f10
# define ft3      $f11
# define ft4      $f12
# define ft5      $f13
# define ft6      $f14
# define ft7      $f15
# define ft8      $f16
# define ft9      $f17
# define ft10     $f18
# define ft11     $f19
# define ft12     $f20
# define ft13     $f21
# define ft14     $f22
# define ft15     $f23
# define fs0      $f24
# define fs1      $f25
# define fs2      $f26
# define fs3      $f27
# define fs4      $f28
# define fs5      $f29
# define fs6      $f30
# define fs7      $f31


/*
 * How to add/sub/load/store/shift pointers
 */
#ifdef __loongarch64
# define PTRLOG 3
# define SZREG  8
# define SZFREG 8
# define REG_L ld.d
# define REG_S st.d
# define FREG_L fld.d
# define FREG_S fst.d
#else
# error __loongarch_xlen must equal 32 or 64
#endif



/* 
 * Stack alignment 
 */
#if _LOONGARCH_SIM == _ABILP64 
# define ALSZ      15
# define ALMASK    ~15
#endif

/* 
 * Stack Frame Definitions 
 */
#if _LOONGARCH_SIM == _ABILP64
# define NARGSAVE  0 /* No caller responsibilities */
#else
#error "unknown. ???:"
#endif


/*
 * LEAF - declare leaf routine
 */
#define LEAF(symbol)                                          \
        .text;                                                \
        .globl  symbol;                                       \
        .align  3;                                            \
        cfi_startproc ;                                       \
        .type  symbol,@function;                              \
symbol:


#endif /* _XPTC_ASM_LOONGARCH_UNIX_H */
