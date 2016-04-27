#include <mpi.h>
#include <cstdio>

bool isprime(int number) {
    if(number == 2) { return true;}

    if(number % 2 == 0) { return false; }

    int k = 3;
    while(k * k <= number) {
        if(number % k == 0) { return false; }
        k += 2;
    }

    return true;
}

int main(int argc, char* argv[]) {

    int size, rank;
    MPI_Status status;

    MPI_Init(&argc, &argv);
    MPI_Comm_size(MPI_COMM_WORLD, &size);
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);

    int max = 10000000;

    int counter = 0;
    for(int num = rank + 1; num <= max; num += size) {
        if(isprime(num)) { ++counter; }
    }

    if(rank != 0) {
        MPI_Send(&counter, 1, MPI_INT, 0, 0, MPI_COMM_WORLD);
    }
    else {
        for(int p = 1; p < size; ++p) {

            int other_count;
            MPI_Recv(&other_count, 1, MPI_INT, MPI_ANY_SOURCE, MPI_ANY_TAG, MPI_COMM_WORLD, &status);
            counter += other_count;
        }

        printf("%d\n", counter);
    }

    MPI_Finalize();
    return 0;
}
