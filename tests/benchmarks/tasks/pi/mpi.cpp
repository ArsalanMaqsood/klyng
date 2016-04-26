#include <mpi.h>
#include <ctime>
#include <cstdio>

double approx_pi(double from, double to) {
    double pi = 0.0;
    double dx = 0.000000002;

    for(double x = from; x < to ; x += dx) {
        pi += 4.0 / (1 + x * x);
    }

    return pi * dx;
}

int main(int argc, char* argv[]) {

    int size, rank;
    MPI_Status status;

    MPI_Init(&argc, &argv);
    MPI_Comm_size(MPI_COMM_WORLD, &size);
    MPI_Comm_rank(MPI_COMM_WORLD, &rank);

    if(rank == 0) {

        double interval_size = 1.0 / size;
        for(int p = 1; p < size; ++p) {
            double range[2];
            range[0] = p * interval_size;
            range[1] = (p + 1) * interval_size;
            MPI_Send(&range, 2, MPI_DOUBLE, p, 0, MPI_COMM_WORLD);
        }

        double local_pi = approx_pi(0, interval_size);

        for(int p = 1; p < size; ++p) {
            double other_pi = 0.0;
            MPI_Recv(&other_pi, 1, MPI_DOUBLE, MPI_ANY_SOURCE, MPI_ANY_TAG, MPI_COMM_WORLD, &status);
            local_pi += other_pi;
        }

        printf("%.3f\n", local_pi);
    }
    else {
        double range[2];
        MPI_Recv(&range, 2, MPI_DOUBLE, 0, 0, MPI_COMM_WORLD, &status);
        double local_pi = approx_pi(range[0], range[1]);
        MPI_Send(&local_pi, 1, MPI_DOUBLE, 0, 1, MPI_COMM_WORLD);
    }

    MPI_Finalize();
    return 0;
}
