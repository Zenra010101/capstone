using GensanPOS.Domain.Entities;



namespace GensanPOS.Domain.Interfaces;



public interface ICustomerRepository : IRepository<Customer>

{

    Task<IReadOnlyList<Customer>> SearchAsync(

        string? search,

        bool includeInactive,

        CancellationToken cancellationToken = default);



    Task<(IReadOnlyList<Customer> Items, int TotalCount)> SearchPagedAsync(

        string? search,

        bool includeInactive,

        int page,

        int pageSize,

        CancellationToken cancellationToken = default);



    Task<Customer?> GetByIdWithReceivablesAsync(Guid id, CancellationToken cancellationToken = default);



    Task<string> GenerateCustomerCodeAsync(CancellationToken cancellationToken = default);

}

