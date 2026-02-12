import { useEffect } from 'react';
import { Autocomplete, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useInventoryStore } from '../../hooks/useInventoryStore';
import type { ManualPurchasePayload } from '../../types';

type Props = {
  onSubmitted?: () => void;
};

const defaultValues: ManualPurchasePayload = {
  supplier: '',
  invoiceNumber: '',
  items: [{ ingredient: '', quantityInGrams: 0, unitPrice: 0 }]
};

const ManualPurchaseForm = ({ onSubmitted }: Props) => {
  const { ingredients, suppliers, fetchIngredients, fetchSuppliers } = useInventoryStore();
  const ingredientOptions = ingredients.map((ingredient) => ({ label: ingredient.name, value: ingredient._id }));
  const supplierOptions = [
    { label: 'Sin especificar', value: '' },
    ...suppliers.map((s) => ({ label: `${s.name} (${s.sku})`, value: s.sku }))
  ];
  const createPurchase = useInventoryStore((state) => state.createPurchase);
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting }
  } = useForm<ManualPurchasePayload>({
    defaultValues
  });
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  useEffect(() => {
    void fetchIngredients();
    void fetchSuppliers();
  }, [fetchIngredients, fetchSuppliers]);

  const onSubmit = handleSubmit(async (values) => {
    await createPurchase(values);
    reset(defaultValues);
    onSubmitted?.();
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Registrar compra manual
        </Typography>
        <Stack spacing={2} component="form" onSubmit={onSubmit}>
          <Controller
            control={control}
            name="supplier"
            render={({ field }) => (
              <Autocomplete
                sx={{ minWidth: 240 }}
                options={supplierOptions}
                value={supplierOptions.find((o) => o.value === (field.value ?? '')) ?? supplierOptions[0]}
                onChange={(_, value) => field.onChange(value?.value ?? '')}
                isOptionEqualToValue={(option, value) => option.value === value.value}
                renderInput={(params) => <TextField {...params} label="Proveedor" />}
              />
            )}
          />
          <Controller control={control} name="invoiceNumber" render={({ field }) => <TextField label="Factura" {...field} />} />
          {fields.map((field, index) => (
            <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Controller
                control={control}
                name={`items.${index}.ingredient`}
                rules={{ required: true }}
                render={({ field: ingredientField }) => (
                  <Autocomplete
                    sx={{ minWidth: 240 }}
                    options={ingredientOptions}
                    value={ingredientOptions.find((option) => option.value === ingredientField.value) ?? null}
                    onChange={(_, value) => ingredientField.onChange(value?.value ?? '')}
                    isOptionEqualToValue={(option, value) => option.value === value.value}
                    renderInput={(params) => <TextField {...params} label="Ingrediente" required />}
                  />
                )}
              />
              <Controller
                control={control}
                name={`items.${index}.quantityInGrams`}
                rules={{ required: true, min: 1 }}
                render={({ field }) => (
                  <TextField
                    label="Cantidad (g)"
                    type="number"
                    value={field.value}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      const normalizedValue = rawValue.replace(/^0+(?=\d)/, '');
                      event.target.value = normalizedValue;
                      field.onChange(normalizedValue === '' ? 0 : Number(normalizedValue));
                    }}
                    required
                  />
                )}
              />
              <Controller
                control={control}
                name={`items.${index}.unitPrice`}
                rules={{ required: true, min: 0 }}
                render={({ field }) => (
                  <TextField
                    label="Precio"
                    type="number"
                    value={field.value}
                    onFocus={(event) => event.target.select()}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      const normalizedValue =
                        rawValue.includes('.') || rawValue.includes(',')
                          ? rawValue.replace(/^0+(?=\d)/, '').replace(',', '.')
                          : rawValue.replace(/^0+(?=\d)/, '');
                      event.target.value = normalizedValue;
                      field.onChange(normalizedValue === '' ? 0 : Number(normalizedValue));
                    }}
                    required
                  />
                )}
              />
              <Button onClick={() => remove(index)} color="error">
                Eliminar
              </Button>
            </Stack>
          ))}
          <Button onClick={() => append({ ingredient: '', quantityInGrams: 0, unitPrice: 0 })}>Agregar ítem</Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            Registrar compra
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default ManualPurchaseForm;

