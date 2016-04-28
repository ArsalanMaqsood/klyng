#include <sys/time.h>
#include <sys/resource.h>

double getcputime() {
    struct rusage r;

    getrusage(RUSAGE_SELF, &r);
    double cputime = (double)r.ru_utime.tv_sec + (double)r.ru_utime.tv_usec * 1e-6;
    cputime += (double)r.ru_stime.tv_sec + (double)r.ru_stime.tv_usec * 1e-6;

    return cputime;
}
